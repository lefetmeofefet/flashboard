import {getUrlParams, registerUrlListener, updateUrlParams} from "../utilz/url-utilz.js";
import {showToast} from "../utilz/toaster.js";
import {Api} from "./api.js";
import {Bluetooth} from "./bluetooth.js";
import {SORT_TYPES} from "./routes-page/routes-filter.js";

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
window.state = GlobalState

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
        GlobalState.selectedWall = response.wallInfo
    }

    for (let route of response.routes) {
        if (GlobalState.selectedWall.likedRouteIds.has(route.id)) {
            route.liked = true
        }
        if (GlobalState.selectedWall.sentRouteIds.has(route.id)) {
            route.sent = true
        }
    }

    GlobalState.routes = response.routes
    GlobalState.holds = response.holds
    GlobalState.holdMapping = new Map()
    for (let hold of GlobalState.holds) {
        GlobalState.holdMapping.set(hold.id, hold)
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
    await unselectHolds()

    GlobalState.configuringHolds = true
    updateUrlParams({configuring: true})  // Important so that clicking "back" won't exit the site

    if (GlobalState.holds.length > 0) {
        showToast("Holds are draggable now!")
    }

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
        GlobalState.selectedRoute = null
        updateUrlParams({route: undefined})
        if (GlobalState.autoLeds) {
            await Bluetooth.clearLeds()
        }
    }

    await unselectHolds()
    await loadRoutesAndHolds()
}

async function exitWall() {
    GlobalState.selectedWall = null
    await Bluetooth.disconnectFromBluetooth()
    updateUrlParams({wall: undefined})
    GlobalState.walls = await Api.getWalls()
}

async function unselectHolds() {
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
    if (GlobalState.isSnaking) {
        GlobalState.isSnaking = false
        updateUrlParams({snaking: undefined})
    } else {
        if (GlobalState.selectedRoute != null || GlobalState.configuringHolds) {
            exitRoutePage()
        } else if (GlobalState.selectedWall != null) {
            exitWall()
        }
    }
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
    isAdmin
}
