import {html, createYoffeeElement} from "../libs/yoffee/yoffee.min.js"
import {GlobalState, exitRoutePage, unselectHolds} from "./state.js"
import "./pages/login-page/login-page.js"
import "./pages/walls-page/walls-page.js"
import "./pages/settings-page/settings-page.js"
import "./pages/snake-page/snake-page.js"
import "./pages/single-route-page/single-route-page.js"
import "./pages/edit-wall-page/edit-wall-page.js"
import "./pages/routes-page/routes-page.js"
import "./components/secondary-header.js"
import "./components/wall-element.js"
import "./components/header.js"
import "./components/footer.js"
import "../libs/yoffee-elements/text-input.js"
import "../libs/yoffee-elements/x-button.js"
import "../libs/yoffee-elements/x-icon.js"
import "../libs/yoffee-elements/x-rating.js"
import "../libs/yoffee-elements/x-checkbox.js"
import "../libs/yoffee-elements/x-tag.js"
import "../libs/yoffee-elements/x-switch.js"
import "../libs/yoffee-elements/x-double-slider.js"
import "../libs/yoffee-elements/x-loader.js"
import "../libs/yoffee-elements/x-dialog.js"
import {privacyPolicy} from "./privacy-policy/privacy-policy-content.js";
import {getUrlParams, updateUrlParams} from "../utilz/url-utilz.js";
import {Flutter} from "./flutter-interface.js";
import {showAlert} from "../utilz/popups.js";

createYoffeeElement("flashboard-app", (props, self) => {
    let state = {
        showAppLinks: localStorage.getItem("no-app-store-links") == null
    }
    window.showPrivacyPolicy = () => {
        GlobalState.showPrivacyPolicy = true
        self.shadowRoot.querySelector("#privacy-policy-dialog").open("center")
        updateUrlParams({privacy: "1"})
    }
    window.closePrivacyPolicy = () => {
        self.shadowRoot.querySelector("#privacy-policy-dialog").close()
        updateUrlParams({privacy: null})
    }

    self.onConnect = () => {
        // If the address is https://flashboard.site/?privacy then open privacy policy yeahhh
        let urlParams = getUrlParams()
        if (urlParams.privacy != null) {
            window.showPrivacyPolicy()
        }
    }

    return html(GlobalState, state)`
<style>
    :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
    }
    
    #privacy-policy-dialog {
        max-height: 80%;
        width: 75%;
        padding: 20px;
        background-color: white;
    }
    
    #app-store-links {
        display: flex;
        justify-content: center;
        width: 100%;
        background-color: var(--secondary-color);
        padding: 12px 0;
        align-items: center;
        gap: 10px;
    }
    
    #app-store-links > img {
        height: 50px;
        cursor: pointer;
    }
    
    #app-store-links > #cancel-button {
        background-color: #00000020;
        position: fixed;
        right: 10px;
        margin-left: auto;
        padding: 5px;
        box-shadow: none;
        border-radius: 100px;
        width: 20px;
        height: 20px;
    }

</style>

${() => state.showAppLinks && window.isMobile && !Flutter.isInFlutter() ? html()`
<div id="app-store-links">
    <img src="../res/images/GetItOnGooglePlay_button.png" onclick=${() => window.open("https://play.google.com/store/apps/details?id=flashboard.site.flashboard", "_blank")}/>
    <img src="../res/images/AppStoreBadge.svg" onclick=${() => window.open("https://apps.apple.com/us/app/flashboard-climbing/id6747072379")}/>
    <x-button id="cancel-button" 
              onclick=${() => {
                  localStorage.setItem("no-app-store-links", "true")
                  state.showAppLinks = false
              }}>
        <x-icon icon="close"></x-icon>
    </x-button>
</div>
` : ""}

${() => {
    if (GlobalState.user == null) {
        return html()`<login-page></login-page>`
    } else if (GlobalState.selectedWall == null) {
        return html()`<walls-page></walls-page>`
    } else if (GlobalState.inSettingsPage) {
        return html()`<settings-page></settings-page>`
    } else if (GlobalState.selectedRoute != null) {
        return html()`<single-route-page route=${() => GlobalState.selectedRoute}></single-route-page>`
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

<x-dialog id="privacy-policy-dialog"
          onclose=${() => GlobalState.showPrivacyPolicy = false}>
    <x-button style="position: fixed;
                     padding: 10px 13px;
                     box-shadow: none;
                     color: black;
                     border-radius: 100px;
                     right: 20px;
                     top: 10px;
                     background-color: #00000010;"
              onclick=${() => closePrivacyPolicy()}>
        <x-icon icon="close"></x-icon>
    </x-button>
    <div style="overflow: auto;">
        ${() => GlobalState.showPrivacyPolicy && privacyPolicy()}
    </div>
</x-dialog>
`
});