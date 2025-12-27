import {html, createYoffeeElement} from "../../../libs/yoffee/yoffee.min.js"
import {
    GlobalState,
    enterRoutePage, exitWall, enterConfigureHoldsPage, sortRoutes,
} from "../../state.js";
import {Bluetooth} from "../../bluetooth.js";
import {Api} from "../../api.js";
import "./routes-list.js"
import "./routes-filter.js"


createYoffeeElement("routes-page", (props, self) => {
    let onScroll = scroll => {
        window.lastScrollPosition = scroll
    }

    self.onConnect = () => {
        self.shadowRoot.querySelector("routes-list").scrollTop = window.lastScrollPosition
    }

    return html(GlobalState)`
<link href="../../../style/scrollbar-style.css" rel="stylesheet">
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
    
    routes-filter {
        
    }
    
    #configure-wall-button {
        background-color: var(--secondary-color);
        border-radius: 100px;
        margin-top: 10px;
    }
    
    #bottom-buttons {
        position: absolute;
        display: flex;
        align-items: center;
        gap: 15px;
        right: 13%;
        bottom: 50px;
    }
    
    #bottom-buttons > .bottom-button {
        border-radius: 1000px;
        color: var(--text-color-on-secondary);
        height: 30px;
        background-color: var(--secondary-color);
        width: fit-content;
        min-width: 30px;
    }
    
    #bottom-buttons > #new-route-button {
        gap: 5px;
    }
    
    #bottom-buttons > #clear-leds-button {
        background-color: var(--background-color);
        font-size: 20px;
        color: var(--text-color);
    }
    
</style>

<header-bar></header-bar>

<routes-filter></routes-filter>

${() => GlobalState.holds.length === 0 && html()`
<x-button id="configure-wall-button"
          onclick=${() => enterConfigureHoldsPage()}>
    Configure wall and add holds
</x-button>
`}

<routes-list onscroll=${e => onScroll(e.target.scrollTop)}></routes-list>

<div id="bottom-buttons">
    <x-button id="clear-leds-button"
              class="bottom-button"
              onclick=${async () => {
        await Bluetooth.clearLeds()
    }}>
        <x-icon icon="light_off"></x-icon>
    </x-button>
    
    <x-button id="new-route-button"
              class="bottom-button"
              onclick=${async () => {
        let {route} = await Api.createRoute()
        route.isNew = true
        GlobalState.routes = [...GlobalState.routes, route]
        sortRoutes()
        await enterRoutePage(route)
    }}>
        ${() => GlobalState.routes.length === 0 && "Create Route"}
        <x-icon icon="add"></x-icon>
    </x-button>
</div>
`
});
