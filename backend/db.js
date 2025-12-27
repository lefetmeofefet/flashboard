import neo4j from "neo4j-driver"
import {Config} from "./config.js";
import {AUTH_METHODS} from "./models.js";
import {ROUTE_TYPES} from "../shared/consts.js";

let driver = neo4j.driver(
    Config.neo4j.uri,
    neo4j.auth.basic(Config.neo4j.user, Config.neo4j.password),
    {
        disableLosslessIntegers: true,
    }
)
const serverInfo = await driver.getServerInfo()
console.log('Connection to neo4j established: ', serverInfo)

async function closeConnection() {
    await driver.close()
}

async function queryNeo4j(query, params, options) {
    try{
        let result = await driver.executeQuery(
            query,
            params,
            {
                database: Config.neo4j.database,
                ...options,
            }
        )
        return result.records.map(record => record.toObject())
    } catch (e) {
        // console.error(e)
        console.trace(e)
        return Promise.reject(`Error querying neo4j: ${e}`)
    }
}

async function queryNeo4jSingleResult(query, params, options) {
    let results = await queryNeo4j(query, params, options)
    return results[0]
}

async function readNeo4j(query, params) {
    return await queryNeo4j(
        query,
        params,
        {routing: neo4j.routing.READ}
    )
}

function generateCode(length = 8) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length)
        result += characters[randomIndex]
    }
    return result
}

async function getWalls(userId) {
    return await readNeo4j(`
    MATCH (wall:Wall) -[:has]-> (user:User{id: $userId})
    RETURN wall.id as id,
           wall.code as code,
           wall.name as name,
           wall.createdAt as createdAt
    ORDER BY wall.createdAt ASC
    `, {userId}
    )
}

async function createLedlessWall(wallName, userId) {
    return await queryNeo4jSingleResult(`
    CREATE (wall:Wall{
        macAddress: null,
        id: randomUUID(),
        code: "${generateCode()}",
        name: $wallName,
        brightness: 80,
        createdAt: timestamp()
    })
    WITH wall
    MATCH (user:User{id: $userId})
    MERGE (wall) -[:has{isAdmin: true}]-> (user)
    RETURN wall.id as id
    `, {wallName, userId})
}

async function connectToWall(macAddress, wallName, brightness, userId) {
    return await queryNeo4jSingleResult(`
    MERGE (wall:Wall{macAddress: $macAddress})
    ON CREATE SET wall.id = randomUUID(),
                  wall.code = "${generateCode()}",
                  wall.name = $wallName,
                  wall.brightness = $brightness,
                  wall.createdAt = timestamp(),
                  wall.createdNow = true
    WITH wall
    MATCH (user:User{id: $userId})
    MERGE (wall) -[e:has]-> (user)
    ON CREATE SET e.isAdmin = wall.createdNow
    SET wall.createdNow = false
    RETURN wall.id as id
    `, {macAddress, wallName, brightness, userId})
}

async function connectToWallByCode(code, userId) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{code: $code}), (user:User{id: $userId})
    MERGE (wall) -[:has]-> (user)
    RETURN wall.id as id
    `, {code, userId})
}

async function setWallMacAddress(wallId, macAddress, userId) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (user:User{id: $userId})
    SET wall.macAddress = $macAddress
    `, {wallId, macAddress, userId})
}

async function deleteWall(wallId, userId) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (user:User{id: $userId})
    OPTIONAL MATCH (wall) -[:has]-> (hold:Hold)
    OPTIONAL MATCH (wall) -[:has]-> (route:Route)
    DETACH DELETE route, hold, wall
    `, {wallId, userId})
}

async function isMacAddressLinkedToWall(macAddress) {
    let result = await queryNeo4jSingleResult(`
    MATCH (wall:Wall{macAddress: $macAddress})
    RETURN wall.id as id
    `, {macAddress})
    return result?.id != null
}

async function getWallInfo(wallId, userId) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId})
    OPTIONAL MATCH (wall) -[e:has]-> (user:User)
    WITH wall, 
         COLLECT({id: user.id, nickname: user.nickname, isAdmin: e.isAdmin, node: user}) as users
    WITH wall, 
         users, 
         [u IN users WHERE u.id = $userId][0].node AS user
    OPTIONAL MATCH (wall) -[:has]-> (route:Route) <-[e:sent|liked|starred]- (user)
    WITH wall, 
         users, 
         COLLECT(CASE WHEN TYPE(e) = "sent" THEN route.id ELSE null END) AS sentRouteIds,
         COLLECT(CASE WHEN TYPE(e) = "liked" THEN route.id ELSE null END) AS likedRouteIds,
         COLLECT(CASE WHEN TYPE(e) = "starred" THEN {routeId: route.id, stars: e.stars} ELSE null END) AS starredRoutes
    RETURN wall.id as id,
           wall.macAddress as macAddress,
           wall.code as code,
           wall.image as image,
           wall.name as name,
           wall.brightness as brightness,
           wall.gradingSystem as gradingSystem,
           wall.createdAt as createdAt,
           wall.defaultHoldDiameter as defaultHoldDiameter,
           sentRouteIds as sentRouteIds,
           likedRouteIds as likedRouteIds,
           starredRoutes as starredRoutes,
           [i IN range(0, size(users) - 1) | {id: users[i].id, nickname: users[i].nickname, isAdmin: users[i].isAdmin}] AS users
    `, {wallId, userId})
}

async function setWallImage(wallId, image) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId})
    SET wall.image = $image
    `, {wallId, image})
}

async function setWallName(wallId, name) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId})
    SET wall.name = $name
    `, {wallId, name})
}

async function setWallBrightness(wallId, brightness) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId})
    SET wall.brightness = $brightness
    `, {wallId, brightness})
}

async function setWallGradingSystem(wallId, gradingSystem) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId})
    SET wall.gradingSystem = $gradingSystem
    `, {wallId, gradingSystem})
}

async function setWallDefaultHoldDiameter(wallId, diameter) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId})
    SET wall.defaultHoldDiameter = $diameter
    `, {wallId, diameter})
}

async function setWallAdmin(wallId, userId, isAdmin) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[e:has]-> (user:User{id: $userId}) 
    SET e.isAdmin = $isAdmin
    `, {wallId, userId, isAdmin})
}

async function getRoutes(wallId, whereClause, parameters) {
    return await readNeo4j(`
    MATCH (:Wall{id: $wallId}) -[:has]-> (route:Route${whereClause || ""})
    OPTIONAL MATCH (route) -[holdEdge:has]-> (hold:Hold)
    
    WITH route, collect(hold) as holds, collect(holdEdge) as holdEdges
    OPTIONAL MATCH (sender:User) -[:sent]-> (route)
    
    WITH route, holds, holdEdges, count(sender) as sends
    OPTIONAL MATCH (route) -[:setter]-> (setter:User)
    
    WITH route, holds, holdEdges, sends, collect(setter) as setters
         
    RETURN route.id as id,
           route.createdAt as createdAt,
           route.name as name, 
           route.grade as grade,
           route.starsAvg as starsAvg,
           route.numRatings as numRatings,
           route.type as type,
           route.lists as lists,
           route.routeStyles as routeStyles,
           sends as sends,
           [setter IN setters | {id: setter.id, nickname: setter.nickname}] AS setters,
           [i IN range(0, size(holds) - 1) | {
               id: holds[i].id, 
               ledIds: holds[i].ledIds,
               group: holds[i].group, 
               holdType: holdEdges[i].holdType
           }] AS holds
    ORDER BY route.createdAt ASC
    `, {wallId, ...(parameters || {})}
    )
}

/** @returns {Promise<Route>} */
async function getRoute(wallId, routeId) {
    let result = await getRoutes(wallId, `{id: $routeId}`, {routeId})
    return result[0]
}

async function createRoute(wallId, setterId) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId}), (setter:User{id: $setterId})
    CREATE (route:Route{
        id: randomUUID(),
        createdAt: timestamp(),
        name: "I AM ROUTE",
        starsAvg: 0,
        numRatings: 0,
        grade: 3,
        lists: [],
        routeStyles: [],
        type: "${ROUTE_TYPES.ALL_HOLDS}"
    })
    CREATE (wall) -[:has]-> (route)
    CREATE (route) -[:setter]-> (setter)
    RETURN route.id as id,
           route.createdAt as createdAt,
           route.name as name, 
           route.grade as grade,
           route.starsAvg as starsAvg,
           route.numRatings as numRatings,
           route.type as type,
           route.lists as lists,
           route.routeStyles as routeStyles,
           0 as sends,
           [{id: setter.id, nickname: setter.nickname}] as setters,
           [] as holds
    `, {wallId, setterId})
}

async function updateRoute(wallId, routeId, routeFields) {
    if (routeFields.name != null || routeFields.grade != null || routeFields.type != null || routeFields.lists != null || routeFields.routeStyles != null) {
        let updateStatements = []
        if (routeFields.name != null) {
            updateStatements.push("route.name = $name")
        }
        if (routeFields.grade != null) {
            updateStatements.push("route.grade = $grade")
        }
        if (routeFields.type != null) {
            updateStatements.push("route.type = $type")
        }
        if (routeFields.lists != null) {
            updateStatements.push(`route.lists = [${routeFields.lists.map((_, index) => "$list_item_" + index).join(", ")}]`)
        }
        if (routeFields.routeStyles != null) {
            updateStatements.push(`route.routeStyles = [${routeFields.routeStyles.map((_, index) => "$route_style_item_" + index).join(", ")}]`)
        }
        if (updateStatements.length > 0) {
            let params = {
                wallId,
                routeId,
                name: routeFields.name || "",
                grade: routeFields.grade || "",
                type: routeFields.type || "",
            }
            for (let i = 0; i < (routeFields.lists || []).length; i += 1) {
                params["list_item_" + i] = routeFields.lists[i]
            }
            for (let i = 0; i < (routeFields.routeStyles || []).length; i += 1) {
                params["route_style_item_" + i] = routeFields.routeStyles[i]
            }
            await queryNeo4j(`
            MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId})
            SET ${updateStatements.join(", ")}
            `, params)
        }
    }
    if (routeFields.setterId != null) {
        await updateSetter(wallId, routeId, routeFields.setterId)
    }
}

async function updateSetter(wallId, routeId, setterId) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId})
    OPTIONAL MATCH (route) -[existingSetterEdge:setter]-> (existingSetter:User)
    DELETE existingSetterEdge
    WITH route
    MATCH (newSetter:User{id: $setterId})
    CREATE (route) -[:setter]-> (newSetter)
    `, {wallId, routeId, setterId})
}

async function updateSentStatus(wallId, routeId, userId, sent) {
    if (sent) {
        await queryNeo4j(`
        MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId}), (user:User{id: $userId}) 
        CREATE (user) -[:sent]-> (route)
        `, {wallId, routeId, userId})
    } else {
        await queryNeo4j(`
        MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId}) <-[e:sent]- (user:User{id: $userId}) 
        DELETE e
        `, {wallId, routeId, userId})
    }
}

async function updateLikedStatus(wallId, routeId, userId, liked) {
    if (liked) {
        await queryNeo4j(`
        MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId}), (user:User{id: $userId}) 
        CREATE (user) -[:liked]-> (route)
        `, {wallId, routeId, userId})
    } else {
        await queryNeo4j(`
        MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId}) <-[e:liked]- (user:User{id: $userId}) 
        DELETE e
        `, {wallId, routeId, userId})
    }
}

async function starRoute(wallId, userId, routeId, stars) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId}), (user:User{id: $userId}) 
    MERGE (user) -[e:starred]-> (route)
    SET e.stars = $stars
    
    WITH route
    MATCH (route) <-[e:starred]- (:User)
    WITH route, avg(e.stars) AS starsAvg, count(e) as numRatings
    SET route.starsAvg = starsAvg,
        route.numRatings = numRatings
    RETURN starsAvg, numRatings
    `, {wallId, userId, routeId, stars})
}

async function deleteRoute(wallId, routeId) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId})
    DETACH DELETE route
    `, {wallId, routeId})
}

async function getRouteSenders(wallId, routeId) {
    return await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId}) <-[:sent]- (user:User) 
    RETURN user.id as id, 
           user.nickname as nickname
    `, {wallId, routeId})
}

async function getHolds(wallId) {
    return await readNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (hold:Hold)
    RETURN hold.id as id,
           hold.ledIds as ledIds,
           hold.group as group,
           hold.diameter as diameter,
           hold.x as x,
           hold.y as y
    `, {wallId})
}

async function createHold(wallId, x, y) {
    return await queryNeo4jSingleResult(`
    // We want sequential ids so we use Counter node
    MATCH (wall:Wall{id: $wallId})
    
    CREATE (hold:Hold{
        id: randomUUID(),
        x: $x,
        y: $y,
        ledIds: []
    })
    CREATE (wall) -[:has]-> (hold)
    RETURN hold.id as id,
           hold.ledIds as ledIds,
           hold.group as group,
           hold.x as x,
           hold.y as y
    `, {wallId, x, y})
}

async function setHoldLeds(wallId, holdId, ledIds) {
    let ledIdParams = {}
    for (let i = 0; i < ledIds.length; i += 1) {
        ledIdParams["list_item_" + i] = ledIds[i]
    }
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (hold:Hold{id: $holdId})
    SET hold.ledIds = [${ledIds.map((_, index) => "$list_item_" + index).join(", ")}]
    `, {wallId, holdId, ...ledIdParams})
}

async function setHoldGroup(wallId, holdId, group) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (hold:Hold{id: $holdId})
    SET hold.group = $group
    `, {wallId, holdId, group})
}

async function setHoldDiameter(wallId, holdId, diameter) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (hold:Hold{id: $holdId})
    SET hold.diameter = $diameter
    `, {wallId, holdId, diameter})
}

async function moveHold(wallId, holdId, x, y) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (hold:Hold{id: $holdId})
    SET hold.x = $x, hold.y = $y
    `, {wallId, holdId, x, y})
}

async function deleteHold(wallId, holdId) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (hold:Hold{id: $holdId})
    DETACH DELETE hold
    `, {wallId, holdId})
}

async function addHoldToRoute(wallId, holdId, routeId, holdType) {
    await queryNeo4j(`
    MATCH (route:Route{id: $routeId}) <-[:has]- (wall:Wall{id: $wallId}) -[:has]-> (hold:Hold{id: $holdId})
    CREATE (route) -[:has{holdType: $holdType}]-> (hold)
    `, {wallId, holdId, routeId, holdType})
}

async function removeHoldFromRoute(wallId, holdId, routeId) {
    await queryNeo4j(`
    MATCH (route:Route{id: $routeId}) -[e:has]-> (hold:Hold{id: $holdId}) <-[:has]- (wall:Wall{id: $wallId})
    DELETE e
    `, {wallId, holdId, routeId})
}

const USER_INFO_RETURN_QUERY = `
user.id as id,
user.email as email,
user.authMethod as authMethod,
user.passwordHash as passwordHash,
user.nickname as nickname,
user.createdAt as createdAt,
user.lastLogin as lastLogin
`

/** @returns {User} */
async function createUser(id, email, passwordHash, authMethod, nickname) {
    return await queryNeo4jSingleResult(`
    CREATE (user:User{
        id: $id,
        email: $email,
        passwordHash: $passwordHash,
        authMethod: $authMethod,
        nickname: $nickname,
        createdAt: timestamp(),
        lastLogin: timestamp()
    })
    RETURN ${USER_INFO_RETURN_QUERY}
    `, {id, email, passwordHash, authMethod, nickname})
}

/** @returns {User} */
async function getUserByEmail(email) {
    return await queryNeo4jSingleResult(`
    MATCH (user:User{email: $email})
    RETURN ${USER_INFO_RETURN_QUERY}
    `, {email}, {routing: neo4j.routing.READ})
}

/** @returns {User} */
async function getUserById(userId) {
    return await queryNeo4jSingleResult(`
    MATCH (user:User{id: $userId})
    RETURN ${USER_INFO_RETURN_QUERY}
    `, {userId}, {routing: neo4j.routing.READ})
}

/** @returns {User} */
async function deleteAccount(userId) {
    await queryNeo4jSingleResult(`
    MATCH (user:User{id: $userId})
    DETACH DELETE user
    `, {userId}, {routing: neo4j.routing.WRITE})
}

async function convertUserToGoogle(email, googleId) {
    return await queryNeo4jSingleResult(`
    MATCH (user:User{email: $email})
    SET user.id = $googleId,
        user.authMethod = $authMethod,
        user.passwordHash = null
    `, {email, googleId, authMethod: AUTH_METHODS.google})
}

async function setUserNickname(userId, nickname) {
    return await queryNeo4j(`
    MATCH (user:User{id: $userId})
    SET user.nickname = $nickname
    `, {userId, nickname})
}

async function updateLoginTime(userId) {
    return await queryNeo4j(`
    MATCH (user:User{id: $userId})
    SET user.lastLogin = timestamp()
    `, {userId})
}

export {
    queryNeo4j,
    readNeo4j,
    getWalls,
    createLedlessWall,
    connectToWall,
    connectToWallByCode,
    setWallMacAddress,
    deleteWall,
    isMacAddressLinkedToWall,
    getWallInfo,
    setWallImage,
    setWallName,
    setWallBrightness,
    setWallGradingSystem,
    setWallDefaultHoldDiameter,
    createUser,
    getUserById,
    getUserByEmail,
    setUserNickname,
    convertUserToGoogle,
    updateLoginTime,
    getRoutes,
    getRoute,
    createRoute,
    updateRoute,
    updateSentStatus,
    updateLikedStatus,
    deleteRoute,
    getHolds,
    createHold,
    setHoldLeds,
    setHoldGroup,
    setHoldDiameter,
    moveHold,
    deleteHold,
    addHoldToRoute,
    removeHoldFromRoute,
    starRoute,
    closeConnection,
    setWallAdmin,
    getRouteSenders,
    deleteAccount
}
