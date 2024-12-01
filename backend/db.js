import neo4j from "neo4j-driver"
import {Config} from "./config.js";
import {AUTH_METHODS} from "./models.js";

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
            options
        )
        return result.records.map(record => record.toObject())
    } catch (e) {
        // console.error(e)
        console.trace(e)
        throw `Error querying neo4j: ${e}`
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

async function readNeo4jSingleResult(query, params) {
    let results = await readNeo4j(query, params)
    return results[0]
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
        brightness: 50,
        createdAt: timestamp()
    })
    WITH wall
    MATCH (user:User{id: $userId})
    MERGE (wall) -[:has]-> (user)
    RETURN wall.id as id
    `, {wallName, userId})
}

async function syncToWall(macAddress, wallName, brightness, userId) {
    return await queryNeo4jSingleResult(`
    MERGE (wall:Wall{macAddress: $macAddress})
    ON CREATE SET wall.id = randomUUID(),
                  wall.code = "${generateCode()}",
                  wall.name = $wallName,
                  wall.brightness = $brightness,
                  wall.createdAt = timestamp()
    WITH wall
    MATCH (user:User{id: $userId})
    MERGE (wall) -[:has]-> (user)
    RETURN wall.id as id
    `, {macAddress, wallName, brightness, userId})
}

async function syncToWallByCode(code, userId) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{code: $code}), (user:User{id: $userId})
    MERGE (wall) -[:has]-> (user)
    RETURN wall.id as id
    `, {code, userId})
}

async function getWallInfo(wallId, userId) {
    return await queryNeo4jSingleResult(`
    MATCH (wall:Wall{id: $wallId})
    OPTIONAL MATCH (wall) -[:has]-> (user:User)
    WITH wall, collect(user) as users
    WITH wall, users, [u IN users WHERE u.id = $userId][0] AS user
    OPTIONAL MATCH (wall) -[:has]-> (route:Route) <-[e:sent|liked]- (user)
    WITH wall, 
         users, 
         COLLECT(CASE WHEN TYPE(e) = "sent" THEN route.id ELSE null END) AS sentRouteIds,
         COLLECT(CASE WHEN TYPE(e) = "liked" THEN route.id ELSE null END) AS likedRouteIds
    RETURN wall.id as id,
           wall.macAddress as macAddress,
           wall.code as code,
           wall.image as image,
           wall.name as name,
           wall.brightness as brightness,
           wall.createdAt as createdAt,
           sentRouteIds as sentRouteIds,
           likedRouteIds as likedRouteIds,
           [i IN range(0, size(users) - 1) | {id: users[i].id, nickname: users[i].nickname}] AS users
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
           route.stars as stars,
           sends as sends,
           [setter IN setters | {id: setter.id, nickname: setter.nickname}] AS setters,
           [i IN range(0, size(holds) - 1) | {id: holds[i].id, holdType: holdEdges[i].holdType}] AS holds
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
        stars: 0,
        grade: 3
    })
    CREATE (wall) -[:has]-> (route)
    CREATE (route) -[:setter]-> (setter)
    RETURN route.id as id,
           route.createdAt as createdAt,
           route.name as name, 
           route.grade as grade,
           route.stars as stars,
           false as sent,
           [{id: setter.id, nickname: setter.nickname}] as setters,
           [] as holds
    `, {wallId, setterId})
}

async function updateRoute(wallId, routeId, name, grade) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId})
    SET route.name = $name, route.grade = $grade
    `, {wallId, routeId, name, grade})
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

async function deleteRoute(wallId, routeId) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId})
    DETACH DELETE route
    `, {wallId, routeId})
}

async function getHolds(wallId) {
    return await readNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (hold:Hold)
    RETURN hold.id as id,
           hold.ledId as ledId,
           hold.x as x,
           hold.y as y
    `, {wallId})
}

async function createHold(wallId) {
    return await queryNeo4jSingleResult(`
    // We want sequential ids so we use Counter node
    MATCH (wall:Wall{id: $wallId})
    
    CREATE (hold:Hold{
        id: randomUUID(),
        x: 0.5,
        y: 0.5,
        ledId: NULL
    })
    CREATE (wall) -[:has]-> (hold)
    RETURN hold.id as id,
           hold.ledId as ledId,
           hold.x as x,
           hold.y as y
    `, {wallId})
}

async function setHoldLed(wallId, holdId, ledId) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (hold:Hold{id: $holdId})
    SET hold.ledId = $ledId
    `, {wallId, holdId, ledId})
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

async function setRouteStars(wallId, routeId, stars) {
    await queryNeo4j(`
    MATCH (wall:Wall{id: $wallId}) -[:has]-> (route:Route{id: $routeId})
    SET route.stars = $stars
    `, {wallId, routeId, stars})
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
    syncToWall,
    syncToWallByCode,
    getWallInfo,
    setWallImage,
    setWallName,
    setWallBrightness,
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
    updateSetter,
    updateSentStatus,
    updateLikedStatus,
    deleteRoute,
    getHolds,
    createHold,
    setHoldLed,
    moveHold,
    deleteHold,
    addHoldToRoute,
    removeHoldFromRoute,
    setRouteStars,
    closeConnection
}
