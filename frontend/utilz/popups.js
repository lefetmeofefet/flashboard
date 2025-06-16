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

// SweetAlert2
async function showAlert(message, {confirmButtonText, confirmButtonColor, text, html, options} = {}) {
    await Swal.fire({
        theme: GlobalState.darkTheme ? "dark" : "light",
        title: message,
        text: text,
        html: html,
        confirmButtonText: confirmButtonText || "OK",
        confirmButtonColor: confirmButtonColor || "#43b9c2",
        icon: "info",
        ...(options || {})
    })
}

async function showConfirm(message, {confirmButtonText, confirmButtonColor, text, options} = {}) {
    let result = await Swal.fire({
        theme: GlobalState.darkTheme ? "dark" : "light",
        title: message,
        text: text,
        showDenyButton: false,
        showCancelButton: true,
        confirmButtonText: confirmButtonText || "Yes",
        confirmButtonColor: confirmButtonColor || "#43b9c2",
        icon: "question",
        ...(options || {})
    })
    return result.isConfirmed
}

async function showPrompt(message, {type, placeholder, label, value, inputAttributes, confirmButtonText, confirmButtonColor, text, options} = {}) {
    let result = await Swal.fire({
        theme: GlobalState.darkTheme ? "dark" : "light",
        title: message,
        text: text,
        input: type || "text",
        inputLabel: label,
        inputPlaceholder: placeholder,
        inputAttributes: inputAttributes,
        inputValue: value,
        showDenyButton: false,
        showCancelButton: true,
        confirmButtonText: confirmButtonText || "OK",
        confirmButtonColor: confirmButtonColor || "#43b9c2",
        ...(options || {})
    })
    return result.value
}

export {showToast, showAlert, showConfirm, showPrompt}
