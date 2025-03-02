import {html, createYoffeeElement} from "../libs/yoffee/yoffee.min.js"
import {GlobalState, onBackClicked} from "./state.js"

createYoffeeElement("secondary-header", (props, self) => {
    self.closeSettingsDialog = () => {
        self.shadowRoot.querySelector("#settings-dialog").close()
    }

    return html(GlobalState, props)`
<style>
    :host {
        position: relative;
        display: flex;
        padding: 15px 25px 10px 25px;
        background-color: var(--secondary-color);
        color: #eeeeee;
        /*align-items: center;*/
        flex-direction: column;
    }
    
    #top-row {
        display: flex;
        align-items: center;
    }
    
    ::slotted([slot="title"]) {
        font-size: 20px;
        padding: 0;
        max-width: 80%;
    }
    
    #top-row > #settings-button {
        margin-left: auto;
        transition: 300ms;
        color: var(--text-color-on-secondary);
        cursor: pointer;
        padding: 10px 5px;
        font-size: 18px;
        border-bottom: 3px solid #00000000;
        display: flex;
        -webkit-tap-highlight-color: transparent;
    }
    
    #top-row > #back-button,
    #top-row > #confirm-button,
    #top-row > #x-button {
        border-radius: 100px;
        width: 10px;
        height: 10px;
        padding: 12px;
        margin-right: 2px;
        color: var(--text-color-on-secondary);
        box-shadow: none;
    }
    
    #settings-dialog {
        padding: 20px 5px;
        color: var(--text-color);
        background-color: var(--background-color); 
        width: max-content;
    }
    
    #settings-container {
        display: flex;
        flex-direction: column;
        align-items: baseline;
    }
    
    ::slotted([slot="dialog-item"]) {
        padding: 10px 20px;
        justify-content: flex-start;
        display: flex;
        align-items: center;
        
        /* x-button css*/
        --overlay-color: rgb(var(--text-color-rgb), 0.1);
        --ripple-color: rgb(var(--text-color-rgb), 0.3);
        box-shadow: none;
        color: var(--text-color);
        width: -webkit-fill-available;
        gap: 10px;
    }
    
    yoffee-list-location-marker {
        display: none;
    }
</style>

${() => GlobalState.loading ? html()`
<style>
    /* Loader */
    :host::after {
        content: "";
        position: absolute;
        bottom: 0;
        left: 0;
        height: 2px;
        width: 0;
        background-color: var(--text-color-weak-2);
        animation: loading 2s infinite;
        margin-bottom: -2px;
        z-index: 1;
    }
    
    @keyframes loading {
        0% { width: 0; margin-left: 0; }
        50% { width: 100%; margin-left: 0; }
        100% { width: 0; margin-left: 100%; }
    }
</style>
` : ""}

<div id="top-row">
    ${() => !props.hidebackbutton && !props.showconfirmbutton && !props.showxbutton && html()`
    <x-button id="back-button"
              onclick=${() => (props.backclicked || onBackClicked)()}>
        <x-icon icon="fa fa-arrow-left"></x-icon>
    </x-button>
    `}
    
    ${() => props.showconfirmbutton && html()`
    <x-button id="confirm-button"
              onclick=${() => console.log("I do nothing")}>
        <x-icon icon="fa fa-check"></x-icon>
    </x-button>
    `}
    
    ${() => props.showxbutton && html()`
    <x-button id="x-button"
              onclick=${() => props.xbuttonclicked()}>
        <x-icon icon="fa fa-times"></x-icon>
    </x-button>
    `}
    
    <slot name="title"></slot>
    <div id="settings-button"
              tabindex="0"
              onkeydown=${() => e => e.stopPropagation()}
              onmousedown=${() => () => {
                  let _dropdown = self.shadowRoot.querySelector("#settings-dialog")
                  let _button = self.shadowRoot.querySelector("#settings-button")
                  _dropdown.toggle(_button, true)
              }}
              onblur=${() => requestAnimationFrame(() => self.closeSettingsDialog())}>
        <x-icon icon="fa fa-bars"></x-icon>
    </div>
    <x-dialog id="settings-dialog"
              onclose=${() => props.whenclosed && props.whenclosed()}>
        <div id="settings-container">
            <slot name="dialog-item"></slot>
        </div>
    </x-dialog>
</div>
<slot name="bottom-row"></slot>
`
})
