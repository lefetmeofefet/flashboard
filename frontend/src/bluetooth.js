import {exitWall, GlobalState} from "./state.js";
import {showToast} from "../utilz/toaster.js";
import {Api} from "./api.js";

const WALL_SERVICE_ID = '5c8468d0-024e-4a0c-a2f1-4742299119e3'
const CHARACTERISTIC_ID = '82155e2a-76a2-42fb-8273-ea01aa87c5be'

let characteristic


async function disconnectFromBluetooth() {
    GlobalState.bluetoothConnected = false
    characteristic = null
}

// Scan and display available walls
async function scanAndConnect(onMessageCb, onDisconnectCb) {
    const device = await navigator.bluetooth.requestDevice({
        filters: [{services: [WALL_SERVICE_ID]}],
        optionalServices: [WALL_SERVICE_ID],
    })

    // Present user with wall name and option to connect
    console.log(`found device `, device)
    console.log(`Connecting to ${device.name}`)
    await connectToDevice(device, onMessageCb)
    device.addEventListener('gattserverdisconnected', () => onDisconnectCb());
    return device.name

    // Testicle
    // setTimeout(() => onMessageCb(JSON.stringify({
    //     command: "wallInfo",
    //     id: '12:34:56:78:90',
    //     brightness: 100,
    //     name: "wole"
    // })), 500)
    // return " am wahll"
}

async function connectToDevice(device, onMessageCb) {
    const server = await device.gatt.connect()
    const service = await server.getPrimaryService(WALL_SERVICE_ID)
    characteristic = await service.getCharacteristic(CHARACTERISTIC_ID)

    // Receive JSON data
    characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const decoder = new TextDecoder()
        const messageString = decoder.decode(event.target.value)
        onMessageCb(messageString)
    })
    await characteristic.startNotifications()

    // // Disconnect after communication
    // await server.disconnect()
}

/** @returns {Wall} */
async function connectToWall(secondTry) {
    GlobalState.loading = true
    try {
        let wallName = await scanAndConnect(
            messageString => {
                console.log('Received:', messageString)
                let message = JSON.parse(messageString)
                if (message.command === "wallInfo") {
                    if (receiveWallInfo != null) {
                        receiveWallInfo(message)
                    }
                } else if (message.command === "killPlayer") {
                    window.onKillPlayer && window.onKillPlayer(message.color)
                } else if (message.command === "playerAteApple") {
                    window.onPlayerAteApple && window.onPlayerAteApple(message.color)
                }
            },
            () => {
                showToast("Disconnected from bluetooth", {error: true})
                GlobalState.bluetoothConnected = false
            }
        )

        // We must set bluetoothConnected = tru before getWallInfo because otherwise getWallInfo will trigger a reconnection lol
        GlobalState.bluetoothConnected = true
        let wallInfo = await getWallInfo()

        // Check if we connected to selected wall in the app
        if (GlobalState.selectedWall != null && wallInfo.id !== GlobalState.selectedWall.macAddress) {
            // if mac address is linked to other wall, we fail.
            // otherwise, ask user if we should connect to the new LED system
            let macAddressLinked = await Api.isMacAddressLinkedToWall(wallInfo.id)
            if (macAddressLinked) {
                showToast(`Nearby LED system is already registered to a different wall ("${wallInfo.name}")! did you choose the right wall in the app?`, {error: true, duration: 10000})
                await disconnectFromBluetooth()
                return Promise.reject("Attempted connecting to a LED system which is already linked to a different wall")
            } else if (confirm("You've connected to a new LED system. Continue?")) {
                await Api.setWallMacAddress(GlobalState.selectedWall.id, wallInfo.id)
                GlobalState.selectedWall.macAddress = wallInfo.id
            } else {
                await disconnectFromBluetooth()
                return Promise.reject("User canceled connection to new wall")
            }
        }
        if (GlobalState.selectedWall != null) {
            GlobalState.selectedWall.brightness = wallInfo.brightness
            try {
                if (GlobalState.selectedWall.name !== wallInfo.name) {
                    console.log("Setting wall name")
                    await setWallName(GlobalState.selectedWall.name)
                }
                if (GlobalState.selectedWall.brightness !== wallInfo.brightness) {
                    console.log("Setting brightness")
                    await setWallBrightness(GlobalState.selectedWall.brightness)
                }
            } catch {}
        }

        return {
            id: wallInfo.id,
            name: wallName,
            brightness: wallInfo.brightness,
        }
    } catch(e) {
        console.log("Error connecting to BT: ", e)
        console.error(e)
        if (e.code === 19) {  // Sometimes happens randomly with the message "GATT Server is disconnected. Cannot retrieve services. (Re)connect first with `device.gatt.connect`."
            // Second try is stupid
            // if (!secondTry) {
            //     console.log(`Failed with msg ${e.toString()}, giving it a second try`)
            //     return await connectToWall(true)
            // }
            showToast(`Error connecting to Bluetooth, device is probably too far away`, {error: true})
            throw new Error(`Error connecting to Bluetooth: ${e.toString()}`)
        }
        if (e.code !== 8) {  // If user pressed "Cancel"
            showToast(`Unknown error connecting to Bluetooth: ${e.toString()}`, {error: true})
            throw new Error(`Unknown error connecting to Bluetooth: ${e.toString()}`)
        }
    } finally {
        GlobalState.loading = false
    }
}

// In bluetooth we must send messages sequentially otherwise we get bugs, so we implement a queue
const messageQueue = []

async function sendBTMessageFromQueue(message) {
    try {
        const encoder = new TextEncoder()
        console.log("Sending to esp: ", message)
        await characteristic.writeValue(encoder.encode(JSON.stringify(message)))
    } catch (e) {
        console.log("Error sending bluetooth message: ", {e})
        console.error(e)
        showToast(`Error sending Bluetooth message: ${e.toString()}`, {error: true})
        if (e.code === 9) {
            // "GATT operation failed for unknown reason."
        } else if (e.code === 19) {
            // Disconnected
            console.log("Disconnected")
        }
    }
}

let consuming = false

async function consumeQueue() {
    if (consuming) {
        return
    }
    consuming = true
    try {
        while (messageQueue.length > 0) {
            let {message, resolve} = messageQueue.shift()
            await sendBTMessageFromQueue(message)
            resolve()
        }
    } finally {
        consuming = false
    }
}

async function sendBTMessage(message){
    if (!GlobalState.bluetoothConnected) {
        let connectionResult = await connectToWall()
        if (connectionResult == null) {
            return
        }
    }
    await sendBTMessageSync(message)
}

function sendBTMessageSync(message) {
    let btMessagePromise
    let promise = new Promise(resolve => btMessagePromise = resolve)
    messageQueue.push({message, resolve: btMessagePromise})
    consumeQueue()
    return promise
}

async function setWallName(wallName) {
    await sendBTMessage({
        command: "setWallName",
        wallName
    })
}

let receiveWallInfo

async function getWallInfo() {

    await sendBTMessage({
        command: "getInfo",
    })
    return new Promise(resolve => receiveWallInfo = resolve)
}

async function setWallBrightness(brightness) {
    await sendBTMessage({
        command: "setBrightness",
        brightness
    })
}

function getLedRGB(isOn, holdType) {
    if (isOn) {
        if (holdType === "start") {
            return {r: 0, g: 255, b: 0}
        } else if (holdType === "finish") {
            return {r: 255, g: 0, b: 0}
        }
        return {r: 0, g: 100, b: 200}
    }
    return {r: 0, g: 0, b: 0}
}

async function highlightRoute(route) {
    let normalLedGroup = getLedRGB(true)
    let startLedGroup = getLedRGB(true, "start")
    let finishLedGroup = getLedRGB(true, "finish")
    normalLedGroup.i = []
    startLedGroup.i = []
    finishLedGroup.i = []
    for (let hold of route.holds) {
        if (hold.holdType === "start") {
            startLedGroup.i.push(hold.ledId)
        } else if (hold.holdType === "finish") {
            finishLedGroup.i.push(hold.ledId)
        } else {
            normalLedGroup.i.push(hold.ledId)
        }
    }
    await sendBTMessage({
        command: "setLeds",
        leds: [normalLedGroup, startLedGroup, finishLedGroup].filter(ledGroup => ledGroup.i.length > 0)
    })
}

async function setLeds(ledGroups) {
    await sendBTMessage({
        command: "setLeds",
        leds: ledGroups
    })
}

async function clearLeds() {
    await sendBTMessage({
        command: "clearLeds"
    })
}

async function setHoldState(hold) {
    await sendBTMessage({
        command: "setLed",
        snakeMode: false,
        led: {
            ...getLedRGB(hold.inRoute, hold.holdType),
            i: hold.ledId
        }
    })
}

async function setSnakeModeLed(r, g, b, i) {
    await sendBTMessage({
        command: "setLed",
        snakeMode: true,
        led: {r, g, b, i}
    })
}

setInterval(async () => {
    if (GlobalState.bluetoothConnected) {
        await sendBTMessage({
            command: "keepawife"
        })
    }
}, 5000)

let Bluetooth = {
    disconnectFromBluetooth,
    connectToWall,
    setWallName,
    highlightRoute,
    setHoldState,
    clearLeds,
    setWallBrightness,
    getWallInfo,
    setSnakeModeLed,
    setLeds,
    messageQueue
}

export {Bluetooth}
