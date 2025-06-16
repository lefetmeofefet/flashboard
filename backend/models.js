

class Wall {
    constructor(id, name, brightness, image, likedRouteIds, sentRouteIds, starredRoutes, users, createdAt, defaultHoldDiameter) {
        this.id = id
        this.name = name
        this.brightness = brightness
        this.image = image
        /** @type {Set} */
        this.likedRouteIds = likedRouteIds
        /** @type {Set} */
        this.sentRouteIds = sentRouteIds
        /** @type {[{routeId, stars}]} */
        this.starredRoutes = starredRoutes

        /** @type {User[]} */
        this.users = users
        this.createdAt = createdAt
        this.defaultHoldDiameter = defaultHoldDiameter
    }

    fromDb(dbObject) {

    }
}

class Route {
    constructor(id, name, grade, setters, holds, sent, liked, sends, createdAt, lists) {
        this.id = id
        this.name = name
        this.grade = grade

        /** @type {User[]} */
        this.setters = setters

        /** @type {Hold[]} */
        this.holds = holds || []
        this.starsAvg = 0
        this.userStars = 0
        this.sent = sent
        this.liked = liked
        this.sends = sends
        this.createdAt = createdAt
        this.lists = lists
    }

    fromDb(dbObject) {

    }
}

class Hold {
    constructor(id, x, y, name) {
        this.id = id
        this.x = x
        this.y = y
        this.name = name
        this.inRoute = false
        this.holdType = ""
        this.group = null
    }

    fromDb(dbObject) {

    }
}

const AUTH_METHODS = {
    email: "email",
    google: "google"
}

class User {
    constructor(id, email, nickname, passwordHash, authMethod, permissionLevel, isAdmin) {
        this.id = id
        this.email = email
        this.nickname = nickname
        this.passwordHash = passwordHash
        this.authMethod = authMethod
        this.isAdmin = isAdmin
    }

    fromDb(dbObject) {

    }
}

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

export {AUTH_METHODS, ERROR_MESSAGES}