import {
    addHoldToRoute,
    createHold,
    createLedlessWall,
    createRoute,
    deleteHold,
    deleteRoute,
    getHolds,
    getRoutes,
    getUserById,
    getWallInfo,
    getWalls,
    moveHold,
    removeHoldFromRoute,
    starRoute,
    setUserNickname,
    setWallBrightness,
    setWallImage,
    setWallName,
    connectToWall,
    connectToWallByCode,
    updateLikedStatus,
    updateRoute,
    updateSentStatus,
    isMacAddressLinkedToWall,
    setWallMacAddress,
    deleteWall,
    setHoldLeds,
    setWallAdmin,
    getRouteSenders, setWallDefaultHoldDiameter, deleteAccount, setHoldGroup, setHoldDiameter
} from "../db.js";
import express from "express";

const router = express.Router()

router.post('/getUser', async (req, res) => {
    let user = await getUserById(req.userId)
    res.json(user)
})

router.post('/deleteAccount', async (req, res) => {
    await deleteAccount(req.userId)
    res.json({status: 'success'})
})

router.post('/setNickname', async (req, res) => {
    const {nickname} = req.body
    await setUserNickname(req.userId, nickname)
    res.json({status: 'success'})
})

router.post('/createLedlessWall', async (req, res) => {
    const {wallName} = req.body
    let wall = await createLedlessWall(wallName, req.userId)
    res.json(wall.id)
})

router.post('/connectToWall', async (req, res) => {
    const {macAddress, wallName, brightness} = req.body
    let wall = await connectToWall(macAddress, wallName, brightness, req.userId)
    res.json(wall.id)
})

router.post('/connectToWallByCode', async (req, res) => {
    const {code} = req.body
    let wall = await connectToWallByCode(code.toUpperCase(), req.userId)
    res.json(wall.id)
})

router.post('/setWallMacAddress', async (req, res) => {
    const {wallId, macAddress} = req.body
    await setWallMacAddress(wallId, macAddress, req.userId)
    res.json({status: "success"})
})

router.post('/deleteWall', async (req, res) => {
    const {wallId} = req.body
    await deleteWall(wallId, req.userId)
    res.json({status: 'success'})
})

router.post('/isMacAddressLinkedToWall', async (req, res) => {
    const {macAddress} = req.body
    res.json(await isMacAddressLinkedToWall(macAddress))
})

router.post('/getWalls', async (req, res) => {
    let walls = await getWalls(req.userId)
    res.json(walls)
})

router.post('/getRoutesAndHolds', async (req, res) => {
    const {wallId, includeWallInfo} = req.body
    res.json({
        routes: await getRoutes(wallId),
        holds: await getHolds(wallId),
        wallInfo: includeWallInfo ? await getWallInfo(wallId, req.userId) : null
    })
})

router.post('/setWallImage', async (req, res) => {
    const {wallId, image} = req.body
    await setWallImage(wallId, image)
    res.json({status: 'success'})
})


router.post('/setWallName', async (req, res) => {
    const {wallId, name} = req.body
    await setWallName(wallId, name)
    res.json({status: 'success'})
})

router.post('/setWallBrightness', async (req, res) => {
    const {wallId, brightness} = req.body
    await setWallBrightness(wallId, brightness)
    res.json({status: 'success'})
})

router.post('/setWallDefaultHoldDiameter', async (req, res) => {
    const {wallId, diameter} = req.body
    await setWallDefaultHoldDiameter(wallId, diameter)
    res.json({status: 'success'})
})

router.post('/createRoute', async (req, res) => {
    const {wallId, setterId} = req.body
    res.json({
        route: await createRoute(wallId, setterId)
    })
})

router.post('/updateRoute', async (req, res) => {
    const {wallId, routeId, routeFields} = req.body
    await updateRoute(wallId, routeId, routeFields)
    res.json({status: 'success'})
})

router.post('/updateSentStatus', async (req, res) => {
    const {wallId, routeId, sent} = req.body
    await updateSentStatus(wallId, routeId, req.userId, sent)
    res.json({status: 'success'})
})

router.post('/updateLikedStatus', async (req, res) => {
    const {wallId, routeId, liked} = req.body
    await updateLikedStatus(wallId, routeId, req.userId, liked)
    res.json({status: 'success'})
})

router.post('/deleteRoute', async (req, res) => {
    const {wallId, routeId} = req.body
    await deleteRoute(wallId, routeId)
    res.json({status: 'success'})
})

router.post('/getRouteSenders', async (req, res) => {
    const {wallId, routeId} = req.body
    res.json({
        senders: await getRouteSenders(wallId, routeId)
    })
})

router.post('/createHold', async (req, res) => {
    const {wallId, x, y} = req.body
    res.json({
        hold: await createHold(wallId, x, y)
    })
})

router.post('/setHoldLeds', async (req, res) => {
    const {wallId, holdId, ledIds} = req.body
    await setHoldLeds(wallId, holdId, ledIds)
    res.json({status: "success"})
})

router.post('/setHoldGroup', async (req, res) => {
    const {wallId, holdId, group} = req.body
    await setHoldGroup(wallId, holdId, group)
    res.json({status: "success"})
})

router.post('/setHoldDiameter', async (req, res) => {
    const {wallId, holdId, diameter} = req.body
    await setHoldDiameter(wallId, holdId, diameter)
    res.json({status: "success"})
})

router.post('/moveHold', async (req, res) => {
    const {wallId, holdId, x, y} = req.body
    await moveHold(wallId, holdId, x, y)
    res.json({status: 'success'})
})

router.post('/deleteHold', async (req, res) => {
    const {wallId, holdId} = req.body
    await deleteHold(wallId, holdId)
    res.json({status: 'success'})
})

router.post('/addHoldToRoute', async (req, res) => {
    const {wallId, holdId, routeId, holdType} = req.body
    await addHoldToRoute(wallId, holdId, routeId, holdType)
    res.json({status: 'success'})
})

router.post('/removeHoldFromRoute', async (req, res) => {
    const {wallId, holdId, routeId} = req.body
    await removeHoldFromRoute(wallId, holdId, routeId)
    res.json({status: 'success'})
})

router.post('/starRoute', async (req, res) => {
    const {wallId, routeId, stars} = req.body
    let result = await starRoute(wallId, req.userId, routeId, stars)
    res.json({
        starsAvg: result.starsAvg,
        numRatings: result.numRatings,
    })
})

router.post('/setWallAdmin', async (req, res) => {
    const {wallId, userId, isAdmin} = req.body
    await setWallAdmin(wallId, userId, isAdmin)
    res.json({status: 'success'})
})

export {router as ApiRouter}
