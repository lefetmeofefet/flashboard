import {html, createYoffeeElement} from "../libs/yoffee/yoffee.min.js"
import {exitWall, GlobalState, isInRoutesPage, onBackClicked} from "./state.js";
import {Bluetooth} from "./bluetooth.js";

createYoffeeElement("footer-bar", (props, self) => {
    return html(GlobalState)`
<style>
    :host {
        display: flex;
        width: auto;
        gap: 15px;
        align-items: center;
        min-height: 40px;
        height: 40px;
        background-color: var(--background-color-3);
        padding: 0 10%;
        user-select: none;
    }
    
    @media (max-width: 900px) {
        :host {
            padding: 0 6%;
        }
    }
    
    #back-button {
        border-radius: 1000px;
        color: var(--text-color-weak);
        font-size: 14px;
        gap: 7px;
        width: fit-content;
        box-shadow: none;
        padding: 3px 7px;
        background-color: var(--background-color-3);
    }
    
    #connection-status {
        color: var(--text-color-weak);
        display: flex;
        align-items: center;
        gap: 5px;
        margin-left: auto;
        background-color: var(--background-color-3);
        border-radius: 100px;
        box-shadow: none;
        padding: 3px 10px;
    }
    
    #connection-status > #check-icon {
        color: var(--great-success-color);
    }
    
    .bt-icon {
        opacity: 0.8;
    }
</style>

<x-button id="back-button"
          onclick=${() => onBackClicked()}>
    <x-icon icon="arrow_back"></x-icon>
    ${() => (GlobalState.bluetoothConnected && isInRoutesPage()) ? "disconnect" : "back"}
</x-button>
<x-button id="connection-status"
     data-connected=${() => GlobalState.bluetoothConnected}
     onclick=${() => !GlobalState.bluetoothConnected && Bluetooth.connectToWall()}>
    ${() => GlobalState.bluetoothConnected && html()`<x-icon id="check-icon" icon="check circle"></x-icon>`}
    ${() => GlobalState.bluetoothConnected ? "connected" : "not connected"}
    <x-icon icon="bluetooth"></x-icon>
</x-button>
    `
})
