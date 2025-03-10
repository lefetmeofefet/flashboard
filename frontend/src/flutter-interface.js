import {onBackClicked} from "./state.js";

function sendMessageToFlutter(type, value) {
    if (window.FlutterChannel) {
        window.FlutterChannel.postMessage(JSON.stringify({type, value}));
    } else {
        console.log("FlutterChannel not available");
    }
}

function isInFlutter() {
    return window.FlutterChannel != null
}

function triggerGoogleSignIn() {
    sendMessageToFlutter("GOOGLE_SIGN_IN")
}

function exitApp() {
    sendMessageToFlutter("EXIT_APP")
}

let btConnectionFinishResolver
async function connectToBoardBluetooth() {
    console.log("Connecting to board bluetooth via app")
    sendMessageToFlutter("CONNECT_TO_BLUETOOTH")
    let wallName = await new Promise(resolve => btConnectionFinishResolver = resolve)
    if (wallName == null) {
        throw {
            fromFlutter: true,
            message: "Couldn't find wall, check that it's turned on and less than 20m away"
        }
    }
    console.log("Finished connecting to board bluetooth via app, wall name: " + wallName)
    return wallName
}

function disconnectFromBoardBluetooth() {
    sendMessageToFlutter("DISCONNECT_FROM_BLUETOOTH")
}

function sendMessageToBoardBluetooth(message) {
    sendMessageToFlutter("SEND_BLUETOOTH_MESSAGE", message)
}

// Functions that flutter can call
window.FlutterMessages = {
    backNavigation: () => {
        onBackClicked()
    },
    signInWithGoogle: function() {
        window.signInWithGoogleIdAndEmail(...arguments)
    },
    onBtConnectionResult: wallName => {
        btConnectionFinishResolver && btConnectionFinishResolver(wallName)
    },
    onBtDisconnected: () => {
        onFlutterBtDisconnect()
    },
    onBtMessage: message => {
        onFlutterBtMessage(message)
    },
}

const Flutter = {
    isInFlutter,
    triggerGoogleSignIn,
    exitApp,
    connectToBoardBluetooth,
    disconnectFromBoardBluetooth,
    sendMessageToBoardBluetooth
}

export {Flutter}
