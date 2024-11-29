import {GlobalState} from "./state.js";
import {showToast} from "../utilz/toaster.js";

let ERROR_MESSAGES = {
    MISSING_TOKEN: "MISSING_TOKEN",
    EXPIRED_TOKEN: "EXPIRED_TOKEN",
    INVALID_TOKEN: "INVALID_TOKEN",
    NO_USER_WITH_EMAIL: "NO_USER_WITH_EMAIL",
    EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
    EMAIL_ALREADY_REGISTERED_WITH_GOOGLE: "EMAIL_ALREADY_REGISTERED_WITH_GOOGLE",
    WRONG_PASSWORD: "WRONG_PASSWORD",
    GOOGLE_LOGIN_FAILED: "GOOGLE_LOGIN_FAILED",
}

async function post(url, data, dontReloadOnFailedAuth) {
    GlobalState.loading = true
    try {
        let res
        try{
            res = await fetch(url, {
                method: "POST",
                headers: Object.assign({
                    "Content-Type": "application/json; charset=utf-8",
                }),
                body: data == null ? null : JSON.stringify(data)
            });
        } catch (e) {
            console.error(e)
            showToast(`Error connecting to server: ${e}`, {error: true})
            throw e
        }

        if (res.ok) {
            return await res.json()
        }
        if (res.status >= 500) {
            showToast(`Error communicating with server`, {error: true})
            return Promise.reject(res)
        }

        try {
            let errorJson = await res.json()
            if (errorJson.error === ERROR_MESSAGES.MISSING_TOKEN || errorJson.error === ERROR_MESSAGES.EXPIRED_TOKEN) {
                if (!dontReloadOnFailedAuth) {
                    window.location.reload()
                }
            }
            return Promise.reject(errorJson)
        } catch(e) {}

        console.error(res)
        return Promise.reject(res)
    } finally {
        GlobalState.loading = false
    }
}

/** @returns {User} */
async function getUser() {
    try {
        return await post("/api/getUser", {}, true)
    } catch (e) {}
}

async function signOut() {
    return await post("/auth/signOut", {})
}

/** @returns {User} */
async function googleAuth(token) {
    return await post("/auth/google", {token})
}

/** @returns {User} */
async function login(email, password) {
    return await post("/auth/login", {email, password})
}

/** @returns {User} */
async function signUp(email, password) {
    return await post("/auth/signUp", {email, password})
}

async function setNickname(nickname) {
    return await post("/api/setNickname", {nickname})
}

async function syncToWall(wallId, wallName, brightness) {
    return await post("/api/syncToWall", {wallId, wallName, brightness})
}

async function getWalls() {
    return await post("/api/getWalls", {})
}

async function getRoutesAndHolds(includeWallInfo, wallId) {
    return await post("/api/getRoutesAndHolds", {
        wallId: wallId || GlobalState.selectedWall.id,
        includeWallInfo: includeWallInfo || false
    })
}

async function setWallImage(image) {
    return await post("/api/setWallImage", {
        wallId: GlobalState.selectedWall.id,
        image
    })
}

async function setWallName(name) {
    return await post("/api/setWallName", {
        wallId: GlobalState.selectedWall.id,
        name
    })
}

async function setWallBrightness(brightness) {
    return await post("/api/setWallBrightness", {
        wallId: GlobalState.selectedWall.id,
        brightness
    })
}

async function createRoute() {
    return await post("/api/createRoute", {
        wallId: GlobalState.selectedWall.id,
        setterId: GlobalState.user.id
    })
}

async function updateRoute(routeId, name, grade) {
    return await post("/api/updateRoute", {wallId: GlobalState.selectedWall.id, routeId, name, grade})
}

async function updateSetter(routeId, setterId) {
    return await post("/api/updateSetter", {wallId: GlobalState.selectedWall.id, routeId, setterId})
}

async function updateSentStatus(routeId, sent) {
    return await post("/api/updateSentStatus", {wallId: GlobalState.selectedWall.id, routeId, sent})
}

async function updateLikedStatus(routeId, liked) {
    return await post("/api/updateLikedStatus", {wallId: GlobalState.selectedWall.id, routeId, liked})
}

async function deleteRoute(routeId) {
    return await post("/api/deleteRoute", {wallId: GlobalState.selectedWall.id, routeId})
}

async function createHold(wallId) {
    return await post("/api/createHold", {wallId: GlobalState.selectedWall.id})
}

async function moveHold(holdId, x, y) {
    return await post("/api/moveHold", {wallId: GlobalState.selectedWall.id, holdId, x, y})
}

async function deleteHold(holdId) {
    return await post("/api/deleteHold", {wallId: GlobalState.selectedWall.id, holdId})
}

async function addHoldToRoute(holdId, routeId, holdType) {
    return await post("/api/addHoldToRoute", {
        wallId: GlobalState.selectedWall.id,
        holdId,
        routeId,
        holdType: holdType || ""
    })
}

async function removeHoldFromRoute(holdId, routeId) {
    return await post("/api/removeHoldFromRoute", {wallId: GlobalState.selectedWall.id, holdId, routeId})
}

async function setRouteStars(routeId, stars) {
    return await post("/api/setRouteStars", {wallId: GlobalState.selectedWall.id, routeId, stars})
}

const Api = {
    getUser,
    syncToWall,
    getWalls,
    getRoutesAndHolds,
    setWallImage,
    setWallName,
    setWallBrightness,
    createRoute,
    updateRoute,
    updateSetter,
    updateSentStatus,
    updateLikedStatus,
    deleteRoute,
    createHold,
    moveHold,
    deleteHold,
    addHoldToRoute,
    removeHoldFromRoute,
    setRouteStars,
    googleAuth,
    login,
    signUp,
    setNickname,
    signOut
}

export {Api}
