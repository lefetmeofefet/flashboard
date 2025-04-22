import {exitWall, GlobalState} from "./state.js";
import {showAlert, showConfirm, showToast} from "../utilz/popups.js";
import {Api} from "./api.js";
import {Flutter} from "./flutter-interface.js";

const WALL_SERVICE_ID = '5c8468d0-024e-4a0c-a2f1-4742299119e3'
const CHARACTERISTIC_ID = '82155e2a-76a2-42fb-8273-ea01aa87c5be'

let characteristic
let btServer

async function disconnectFromBluetooth() {
    try {
        if (btServer != null) {
            await btServer.disconnect()
        }
        if (Flutter.isInFlutter()) {
            Flutter.disconnectFromBoardBluetooth()
        }
    } catch(e) {
        console.log("Failed disconnecting from BT")
        console.error(e)
    }
    GlobalState.bluetoothConnected = false
    characteristic = null
}

// Scan and display available walls
async function scanAndConnect(onMessageCb, onDisconnectCb) {
    if (Flutter.isInFlutter()) {
        console.log("IN FLUTTER!!!")
        // TODO: implement onDisconnectCb
        window.onFlutterBtMessage = message => onMessageCb(message)
        window.onFlutterBtDisconnect = () => onDisconnectCb()
        return await Flutter.connectToBoardBluetooth()
    }

    // Check if iphone or for other reason the API is not supported
    if (navigator.bluetooth?.requestDevice == null) {
        throw {
            errorName: "noBluetooth",
            knownError: "This browser doesn't support bluetooth, please use the Flashboard app"
        }
    }

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
    btServer = await device.gatt.connect()
    const service = await btServer.getPrimaryService(WALL_SERVICE_ID)
    characteristic = await service.getCharacteristic(CHARACTERISTIC_ID)

    // Receive JSON data
    characteristic.addEventListener('characteristicvaluechanged', (event) => {
        const decoder = new TextDecoder()
        const messageString = decoder.decode(event.target.value)
        onMessageCb(messageString)
    })
    await characteristic.startNotifications()
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
            } else if (await showConfirm("You've connected to a new LED system. Continue?")) {
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
        if (e.knownError) {
            if (e.errorName === "noBluetooth") {
                showToast(e.knownError, {duration: 5000, error: true})
                if (window.isIOS) {
                    showAlert("iPhone browsers don't support bluetooth", {
                        html: `iPhone browsers do not support bluetooth. The iPhone app is coming soon, meanwhile to use bluetooth please do the following:
                                <br>
                                - Install the <a href='https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055' style='color: var(--secondary-color);'>Bluefy App</a> 
                                <br>
                                - Open it and go to flashboard.site`
                    })
                }
            } else {
                showToast(e.knownError, {duration: 5000, error: true})
            }
            throw new Error(e.knownError)
        } if (e.fromFlutter) {
            showToast(e.message, {duration: 5000, error: true})
            throw new Error(`Flutter error connecting to Bluetooth: ${e.message}`)
        } else if (e.code === 19) {  // Sometimes happens randomly with the message "GATT Server is disconnected. Cannot retrieve services. (Re)connect first with `device.gatt.connect`."
            // Second try is stupid
            // if (!secondTry) {
            //     console.log(`Failed with msg ${e.toString()}, giving it a second try`)
            //     return await connectToWall(true)
            // }
            showToast(`Error connecting to Bluetooth, device is probably too far away or there are already 3 devices connected`, {error: true, duration: 10000})
            throw new Error(`Error connecting to Bluetooth: ${e.toString()}`)
        } else if (e.code === 8) {
            // If user pressed "Cancel"
        } else {
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
        console.log("Sending to esp: ", JSON.stringify(message))
        let msg = JSON.stringify(message)
        if (Flutter.isInFlutter()) {
            Flutter.sendMessageToBoardBluetooth(msg)
        } else {
            await characteristic.writeValue(encoder.encode(msg))
        }
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
            return Promise.reject("Didn't connect to wall")
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
        } else if (holdType === "foot") {
            return {r: 200, g: 0, b: 200}
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
    let footLedGroup = getLedRGB(true, "foot")
    let finishLedGroup = getLedRGB(true, "finish")
    normalLedGroup.i = []
    startLedGroup.i = []
    footLedGroup.i = []
    finishLedGroup.i = []
    for (let hold of route.holds.filter(h => h.ledId != null)) {
        if (hold.holdType === "start") {
            startLedGroup.i.push(hold.ledId)
        } else if (hold.holdType === "foot") {
            footLedGroup.i.push(hold.ledId)
        } else if (hold.holdType === "finish") {
            finishLedGroup.i.push(hold.ledId)
        } else {
            normalLedGroup.i.push(hold.ledId)
        }
    }
    await sendBTMessage({
        command: "setLeds",
        leds: [normalLedGroup, startLedGroup, footLedGroup, finishLedGroup].filter(ledGroup => ledGroup.i.length > 0)
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
    if (hold.ledId != null) {
        await sendBTMessage({
            command: "setLed",
            snakeMode: false,
            led: {
                ...getLedRGB(hold.inRoute, hold.holdType),
                i: hold.ledId
            }
        })
    }
}

async function setSnakeModeLed(r, g, b, i) {
    if (i != null) {
        await sendBTMessage({
            command: "setLed",
            snakeMode: true,
            led: {r, g, b, i}
        })
    }
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
