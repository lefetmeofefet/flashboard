// Function to receive messages from Flutter
window.receiveFromFlutter = function (message) {
    console.log("Received from Flutter:", message);
    alert("Flutter says: " + message);
};

// Send a message to Flutter
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

const Flutter = {
    isInFlutter,
    triggerGoogleSignIn,
    exitApp
}

export {Flutter}
