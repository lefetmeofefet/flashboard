import {html, createYoffeeElement} from "../../libs/yoffee/yoffee.min.js"
import {chooseWall, GlobalState} from "../state.js";
import "../components/text-input.js"
import "../components/x-button.js"
import "../components/x-icon.js"
import {Bluetooth} from "../bluetooth.js";
import {getUrlParams, updateUrlParams} from "../../utilz/url-utilz.js";
import {Api} from "../api.js";
import {showPrompt, showToast} from "../../utilz/popups.js";

createYoffeeElement("walls-page", () => {
    let urlParams = getUrlParams()
    if (urlParams.code != null) {
        enterWithCode(urlParams.code)
        updateUrlParams({code: undefined})
    }

    async function connectToNearbyWall() {
        let btWall = await Bluetooth.connectToWall()
        // let btWall = {id: "i_am_shit_mac_address", name: "Fucktest", brightness: 30}
        let macAddress = btWall.id
        let wallId = await Api.connectToWall(macAddress, btWall.name, btWall.brightness)
        await chooseWall(wallId)
    }

    async function createLedlessWall() {
        function getRandomItem(array) {
            const randomIndex = Math.floor(Math.random() * array.length)
            return array[randomIndex]
        }
        let WALL_NAMES = [
            "WHOL", "WALL", "BOARD",
            "WOODY", "WOODY", "WOODY", "WOODY", "WOODY",
            "PLANK", "BORDEN", "CRIMP", "EL CAP", "OFFDWAGON", "CAMP4", "JUGSICLE", "CRAMPS", "BOLDR", "SILENCE", "MEGABOARD", "FINGRTRAP"
        ]
        let name = getRandomItem(WALL_NAMES)
        let wallId = await Api.createLedlessWall(name)
        await chooseWall(wallId)
        showToast(`Created new wall! welcome to ${name}!`)
    }

    async function enterWithCode(code) {
        if (code == null) {
            code = await showPrompt("Join with code", {
                placeholder: "Wall code",
                confirmButtonText: "Join"
            })
        }
        if (code != null) {
            let wallId = await Api.connectToWallByCode(code)
            await chooseWall(wallId)
        }
    }

    return html(GlobalState)`
<link href="../../style/scrollbar-style.css" rel="stylesheet">
<style>
    :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        padding: 20px 10% 0 10%;
    }
    
    @media (max-width: 900px) {
        :host {
            padding: 20px 6% 0 6%;
        }
    }
    
    #walls {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
    }
    
    .wall {
        display: flex;
        flex-direction: column;
        align-items: start;
        padding: 16px 5px;
        border-radius: 0;
        color: unset;
        box-shadow: none;
        min-height: 40px;
        height: 40px; /* Important for scroll not moving when reloading*/
        --overlay-color: rgb(var(--text-color-rgb), 0.1);
        --ripple-color: rgb(var(--text-color-rgb), 0.3);
    }
    
    .wall + .wall {
        border-top: 1px solid var(--text-color-weak-3);
    }
    
    .wall > .name {
        font-size: 20px;
    }
    
    .wall > .identifier {
        color: var(--text-color-weak-1);
    }
    
    #or {
        font-size: 20px;
    }
    
    .big-button {
        margin-top: 20px;
        border-radius: 1000px;
        height: 30px;
        min-height: 30px;
        gap: 10px;
        width: auto;
        max-width: 400px;
    }
    
    #connect-button {
        color: var(--text-color-on-secondary);
        background-color: var(--secondary-color);
    }
    
    #create-wall-button {
        background-color: var(--background-color-3);
        color: var(--text-color);
    }
    
    #enter-code-button {
        background-color: var(--background-color-3);
        color: var(--text-color);
        margin-bottom: 30px;
    }
</style>
<header-bar></header-bar>
<div id="walls">
    ${() => GlobalState.walls?.map(wall => html()`
    <x-button class="wall"
              onclick=${() => chooseWall(wall.id)}>
        <div class="name">${() => wall.name}</div>
        <div class="identifier">${() => wall.code}</div>
    </x-button>
    `)}
</div>

<x-button id="connect-button"
          class="big-button"
          onclick=${async () => await connectToNearbyWall()}>
    Connect to nearby wall
    <x-icon icon="fa fa-lightbulb"></x-icon>
</x-button>
<x-button id="create-wall-button"
          class="big-button"
          onclick=${async () => await createLedlessWall()}>
    Create wall without LEDs
    <x-icon icon="fa fa-plus"></x-icon>
</x-button>
<x-button id="enter-code-button"
          class="big-button"
          onclick=${async () => await enterWithCode()}>
    Join by code
    <x-icon icon="fa fa-key"></x-icon>
</x-button>
`
});
