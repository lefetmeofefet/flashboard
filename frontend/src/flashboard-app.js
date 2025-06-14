import {html, createYoffeeElement} from "../libs/yoffee/yoffee.min.js"
import {GlobalState, exitRoutePage, unselectHolds} from "./state.js"
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
    <img src="../res/images/AppStoreBadge.svg" onclick=${() => showAlert("iPhone app coming soon!", {html: "Meanwhile to use bluetooth on iPhones:<br>- Install the <a href='https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055' style='color: var(--secondary-color);'>Bluefy App</a> <br>- Open it and go to flashboard.site"})}/>
    <x-button id="cancel-button" 
              onclick=${() => {
                  localStorage.setItem("no-app-store-links", "true")
                  state.showAppLinks = false
              }}>
        <x-icon icon="fa fa-times"></x-icon>
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
        <x-icon icon="fa fa-times"></x-icon>
    </x-button>
    <div style="overflow: auto;">
        ${() => GlobalState.showPrivacyPolicy && privacyPolicy()}
    </div>
</x-dialog>
`
});