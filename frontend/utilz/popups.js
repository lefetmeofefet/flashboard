import {GlobalState} from "../src/state.js";

function showToast(message, {duration = 3000, error = false, position = "top"} = {}) {
    Toastify({
        text: message,
        duration: duration,
        gravity: position || "top", // `top` or `bottom`
        position: "right", // `left`, `center` or `right`
        style: {
            background: error ? "linear-gradient(to right, #ff3f3d, #ff8351)" : "linear-gradient(135deg,#73a5ff,#5477f5)"
        },
        close: true // Add close button
    }).showToast();
}

async function showAlert(message, {confirmButtonText, confirmButtonColor, text, html} = {}) {
    await Swal.fire({
        theme: GlobalState.darkTheme ? "dark" : "light",
        title: message,
        text: text,
        html: html,
        confirmButtonText: confirmButtonText || "OK",
        confirmButtonColor: confirmButtonColor || "#43b9c2",
    })
}

async function showConfirm(message, {confirmButtonText, confirmButtonColor}) {
    let result = await Swal.fire({
        theme: GlobalState.darkTheme ? "dark" : "light",
        title: message,
        showDenyButton: false,
        showCancelButton: true,
        confirmButtonText: confirmButtonText || "Yes",
        confirmButtonColor: confirmButtonColor || "#43b9c2",
    })
    return result.isConfirmed
}

export {showToast, showAlert, showConfirm}
