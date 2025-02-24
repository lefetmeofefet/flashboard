import {html, createYoffeeElement} from "../libs/yoffee/yoffee.min.js"
import {GlobalState, exitRoutePage, unselectHolds} from "./state.js";
import "./login-page/login-page.js"
import "./walls-page/walls-page.js"
import "./settings-page/settings-page.js"
import "./snake-page.js"
import "./single-route-page/single-route-page.js"
import "./edit-wall-page/edit-wall-page.js"
import "./secondary-header.js"
import "./wall-element.js"
import "./header.js"
import "./footer.js"
import "./routes-page/routes-page.js"
import "./components/text-input.js"
import "./components/x-button.js"
import "./components/x-icon.js"
import "./components/x-rating.js"
import "./components/x-checkbox.js"
import "./components/x-tag.js"

createYoffeeElement("flashboard-app", (props, self) => {
    let state = {

    };


    return html(GlobalState, state)`
<style>
    :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }

</style>
${() => {
    if (GlobalState.user == null) {
        return html()`<login-page></login-page>`
    } else if (GlobalState.selectedWall == null) {
        return html()`<walls-page></walls-page>`
    } else if (GlobalState.inSettingsPage) {
        return html()`<settings-page></settings-page>`
    } else if (GlobalState.selectedRoute != null) {
        return html()`<single-route-page></single-route-page>`
    } else if (GlobalState.configuringHolds) {
        return html()`<edit-wall-page></edit-wall-page>`
    } else if (GlobalState.isSnaking) {
        return html()`<snake-page></snake-page>`
    } else {
        return html()`<routes-page></routes-page>`
    }
}}

${() => GlobalState.selectedWall != null && html()`
<footer-bar></footer-bar>
`}
`
});