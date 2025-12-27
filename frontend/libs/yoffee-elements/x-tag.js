import {html,  createYoffeeElement} from "../yoffee/yoffee.min.js"
import "./x-button.js"

createYoffeeElement("x-tag", () => {
    let state = {
        isOn: false
    }
    return html(state)`
    <style>
        x-button {
            border-radius: inherit;
        }
    </style>    

    ${() => state.isOn ? html()`
    <style>
        x-button {
            --button-color: var(--secondary-color);
            color: #eeeeee;
        }
    </style>
    ` : html()`
    <style>
        x-button {
            --button-color: var(--background-color);
            color: var(--text-color);
        }
    </style>
    `}    
    
    <x-button onclick=${() => state.isOn = !state.isOn}>
        <slot></slot>
    </x-button>
    `
})