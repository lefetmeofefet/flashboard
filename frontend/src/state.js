import {getUrlParams, registerUrlListener, updateUrlParams} from "../utilz/url-utilz.js";
import {showToast} from "../utilz/popups.js";
import {Api} from "./api.js";
import {Bluetooth} from "./bluetooth.js";
import {SORT_TYPES} from "./routes-page/routes-filter.js";
import {Flutter} from "./flutter-interface.js";

const LOCALSTORAGE_AUTO_LEDS_KEY = "auto_ledz"

function setAutoLeds(autoLeds) {
    GlobalState.autoLeds = autoLeds
    localStorage.setItem(LOCALSTORAGE_AUTO_LEDS_KEY, autoLeds ? "true" : "false")
}

let WallImage = null
const GlobalState = {
    darkTheme: false,
    loading: false,
    bluetoothConnected: false,
    configuringHolds: false,
    inSettingsPage: false,
    autoLeds: localStorage.getItem(LOCALSTORAGE_AUTO_LEDS_KEY) === "true",  // Automatically light leds when clicking a route

    /** @type {User} */
    user: null,

    /** @type {Wall[]} */
    walls: [],

    /** @type {Wall} */
    selectedWall: null,

    /** @type {Route[]} */
    routes: [],

    /** @type {string[]} */
    lists: [],  // Hold list names

    /** @type {Route} */
    selectedRoute: null,

    /** @type {Hold[]} */
    holds: [],

    /** @type {Map<string, Hold>} */
    holdMapping: new Map(),

    filters: [],
    freeTextFilter: null,
    sorting: SORT_TYPES.NEWEST
};

let filteredRoutes = []

function setFilteredRoutes(routes) {
    filteredRoutes = routes
}

function getFilteredRoutes() {
    return filteredRoutes
}

window.state = GlobalState

function initFilters() {
    GlobalState.filters = []
    GlobalState.freeTextFilter = null
    GlobalState.sorting = SORT_TYPES.NEWEST
}

function isAdmin() {
    if (GlobalState.selectedWall == null) {
        return
    }
    let myUserInWall = GlobalState.selectedWall.users.find(user => user.id === GlobalState.user.id)
    return myUserInWall?.isAdmin
}

const LOCALSTORAGE_DARK_THEME_KEY = "darkTheme"

function updateTheme(isDark) {
    GlobalState.darkTheme = isDark;
    document.body.setAttribute("theme", GlobalState.darkTheme ? "dark" : "light")
    localStorage.setItem(LOCALSTORAGE_DARK_THEME_KEY, GlobalState.darkTheme)
}

let localStorageDarkTheme = localStorage.getItem(LOCALSTORAGE_DARK_THEME_KEY)
if (localStorageDarkTheme != null) {
    updateTheme(localStorageDarkTheme === "true", true)
} else {
    let isUserDarkTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    updateTheme(isUserDarkTheme, true)
}

async function loadRoutesAndHolds(includeWallInfo, wallId) {
    let response = await Api.getRoutesAndHolds(includeWallInfo, wallId)
    if (response.wallInfo != null) {
        WallImage = response.wallInfo.image
        delete response.wallInfo.image
        response.wallInfo.likedRouteIds = new Set(response.wallInfo.likedRouteIds)
        response.wallInfo.sentRouteIds = new Set(response.wallInfo.sentRouteIds)

        // Set starredRoutes
        let starredRoutesList = response.wallInfo.starredRoutes
        response.wallInfo.starredRoutes = {}
        for (let starredRoute of starredRoutesList) {
            response.wallInfo.starredRoutes[starredRoute.routeId] = starredRoute.stars
        }

        if (response.wallInfo.defaultHoldDiameter == null) {
            response.wallInfo.defaultHoldDiameter = 6
        }
        GlobalState.selectedWall = response.wallInfo
        GlobalState.defaultHoldDiameter = GlobalState.selectedWall.defaultHoldDiameter
    }

    let lists = new Set()
    for (let route of response.routes) {
        if (GlobalState.selectedWall.likedRouteIds.has(route.id)) {
            route.liked = true
        }
        if (GlobalState.selectedWall.sentRouteIds.has(route.id)) {
            route.sent = true
        }
        route.userStars = GlobalState.selectedWall.starredRoutes[route.id] || 0;
        (route.lists || []).forEach(list => lists.add(list))
    }
    GlobalState.routes = response.routes
    GlobalState.lists = [...lists].sort((a, b) => a < b ? -1 : 1)
    sortRoutes()
    GlobalState.holds = response.holds
    GlobalState.holdMapping = new Map()
    for (let hold of GlobalState.holds) {
        GlobalState.holdMapping.set(hold.id, hold)
    }
}

async function chooseWall(wallId) {
    let urlParams = getUrlParams()
    try {
        GlobalState.loading = true
        await loadRoutesAndHolds(true, wallId)
        updateUrlParams({wall: GlobalState.selectedWall.name})

        if (urlParams.route != null) {
            let route = GlobalState.routes.find(r => r.id === urlParams.route)
            if (route != null) {
                await enterRoutePage(route)
            }
        } else if (urlParams.configuring != null) {
            await enterConfigureHoldsPage()
        }
    } finally {
        GlobalState.loading = false
    }
}

/** @param route {Route} */
async function enterRoutePage(route) {
    GlobalState.selectedRoute = route
    updateUrlParams({route: route.id})
    if (GlobalState.autoLeds) {
        Bluetooth.highlightRoute(GlobalState.selectedRoute)
    }
}

async function enterConfigureHoldsPage() {
    unselectHolds()

    GlobalState.configuringHolds = true
    updateUrlParams({configuring: true})  // Important so that clicking "back" won't exit the site

    if (GlobalState.bluetoothConnected) {
        await Bluetooth.clearLeds()
    }
}

async function exitRoutePage() {
    if (GlobalState.configuringHolds) {
        GlobalState.configuringHolds = false
        if (GlobalState.bluetoothConnected) {
            await Bluetooth.clearLeds()
        }
        updateUrlParams({configuring: undefined})
    } else {
        // If we exit an empty route, just delete it
        if (GlobalState.selectedRoute.holds.length === 0) {
            await Api.deleteRoute(GlobalState.selectedRoute.id)
        }
        GlobalState.selectedRoute = null
        updateUrlParams({route: undefined})
        if (GlobalState.autoLeds) {
            await Bluetooth.clearLeds()
        }
    }

    unselectHolds()
    await loadRoutesAndHolds()
}

async function exitWall() {
    GlobalState.selectedWall = null
    await Bluetooth.disconnectFromBluetooth()
    updateUrlParams({wall: undefined})
    GlobalState.walls = await Api.getWalls()
}

function unselectHolds() {
    for (let hold of GlobalState.holds) {
        if (hold.inRoute || hold.holdType !== "") {
            hold.inRoute = false
            hold.holdType = ""
        }
    }
}

function snakeMeUp() {
    GlobalState.isSnaking = true
    updateUrlParams({snaking: true})  // Important so that clicking "back" won't exit the site
}

async function toggleLikeRoute(route) {
    route.liked = !route.liked
    if (route.liked) {
        GlobalState.selectedWall.likedRouteIds.add(route.id)
    } else {
        GlobalState.selectedWall.likedRouteIds.delete(route.id)
    }
    await Api.updateLikedStatus(route.id, route.liked)
}

async function toggleSentRoute(route) {
    route.sent = !route.sent

    if (route.sent) {
        route.sends += 1
        GlobalState.selectedWall.sentRouteIds.add(route.id)
    } else {
        route.sends -= 1
        GlobalState.selectedWall.sentRouteIds.delete(route.id)
    }
    await Api.updateSentStatus(route.id, route.sent)
    if (route.sent) {
        showToast("Congratulations! Marked as sent.")
    }
}

function onBackClicked() {
    if (GlobalState.showPrivacyPolicy) {
        closePrivacyPolicy()
    } else if (GlobalState.isSnaking) {
        GlobalState.isSnaking = false
        updateUrlParams({snaking: undefined})
    } else if (GlobalState.inSettingsPage) {
        GlobalState.inSettingsPage = false
    } else if (GlobalState.selectedRoute != null || GlobalState.configuringHolds) {
        exitRoutePage()
    } else if (GlobalState.selectedWall != null) {
        exitWall()
        initFilters()
    } else if (Flutter.isInFlutter()) {
        Flutter.exitApp()
    }
}


let shuffleSortSeed
function seedShuffleSort() {
    shuffleSortSeed = Math.floor(Math.random() * 2**32)
}
seedShuffleSort()

function mulberry32random(seed) {
    let t = seed
    return function () {
        t |= 0
        t = t + 0x6D2B79F5 | 0
        let r = Math.imul(t ^ t >>> 15, 1 | t)
        r ^= r + Math.imul(r ^ r >>> 7, 61 | r)
        return ((r ^ r >>> 14) >>> 0) / 4294967296
    }
}

function sortRoutes() {
    if (GlobalState.sorting === SORT_TYPES.SHUFFLE) {
        console.log("Shuffling sort with seed: ", shuffleSortSeed)
        let seededShuffleSortRandom = mulberry32random(shuffleSortSeed)
        let sortedRoutes = GlobalState.routes
            .sort((r1, r2) => r1.createdAt < r2.createdAt ? 1 : -1)
        let shuffleSortedRoutes = []
        while (sortedRoutes.length > 0) {
            let index = Math.floor(seededShuffleSortRandom() * sortedRoutes.length)
            let route = sortedRoutes.splice(index, 1)[0]
            shuffleSortedRoutes.push(route)
        }
        GlobalState.routes = shuffleSortedRoutes
        return
    }
    GlobalState.routes = GlobalState.routes.sort((r1, r2) => {
        if (GlobalState.sorting === SORT_TYPES.NEWEST) {
            return r1.createdAt < r2.createdAt ? 1 : -1
        } else if (GlobalState.sorting === SORT_TYPES.OLDEST) {
            return r1.createdAt < r2.createdAt ? -1 : 1
        } else if (GlobalState.sorting === SORT_TYPES.RATING) {
            return r1.starsAvg < r2.starsAvg ? 1 : -1
        } else if (GlobalState.sorting === SORT_TYPES.MOST_SENDS) {
            return r1.sends < r2.sends ? 1 : -1
        } else if (GlobalState.sorting === SORT_TYPES.LEAST_SENDS) {
            return r1.sends < r2.sends ? -1 : 1
        } else if (GlobalState.sorting === SORT_TYPES.HARDEST) {
            return r1.grade < r2.grade ? 1 : -1
        } else if (GlobalState.sorting === SORT_TYPES.EASIEST) {
            return r1.grade < r2.grade ? -1 : 1
        }
    })
}

function isInRoutesPage() {
    return GlobalState.selectedRoute == null && !GlobalState.inSettingsPage && !GlobalState.configuringHolds
}

registerUrlListener(() => onBackClicked())

async function signOut() {
    await Api.signOut()
    window.location.reload()
}

export {
    GlobalState,
    WallImage,
    exitWall,
    loadRoutesAndHolds,
    chooseWall,
    enterRoutePage,
    exitRoutePage,
    updateTheme,
    unselectHolds,
    enterConfigureHoldsPage,
    snakeMeUp,
    setAutoLeds,
    toggleLikeRoute,
    toggleSentRoute,
    signOut,
    onBackClicked,
    isAdmin,
    sortRoutes,
    seedShuffleSort,
    isInRoutesPage,
    setFilteredRoutes,
    getFilteredRoutes
}
