import {html, createYoffeeElement} from "../../../libs/yoffee/yoffee.min.js"
import {GlobalState} from "../../state.js"
import {Api} from "../../api.js"
import {showToast} from "../../../utilz/popups.js";


createYoffeeElement("settings-page", (props, self) => {
    const state = {

    }

    return html(GlobalState, state)`
<style>
    :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
    }
    
    #title {
        width: 80%;
        display: flex;
        align-items: center;
    }
    
    #title > #title-text {
        white-space: nowrap;
    }
    
    @media (max-width: 400px) {
        #title > #title-text {
            font-size: 16px;
        }
    }
    
    #users-list {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        margin: 10px 20px;
    }
    
    #users-list > .user {
        display: flex;
        align-items: center;
        padding: 10px;
        gap: 8px;
        font-size: 12px;
    }
    
    .user + .user {
        border-top: 1px solid var(--text-color-weak-3);
    }
    
    .user > .nickname {
        font-size: 20px;
    }
    
    .user > .admin-badge {
        color: var(--secondary-color);
        font-size: 16px;
        background-color: var(--background-color-3);
        padding: 2px 8px;
        border-radius: 100px;
        border: 1px solid var(--text-color-weak-3);
    }
    
    .user > .toggle-admin-button {
        margin-left: auto;
        font-size: 15px;
        border-radius: 100px;
        background-color: var(--background-color-3);
        color: var(--text-color);
    }
    
    yoffee-list-location-marker {
        display: none;
    }
</style>

<secondary-header backclicked=${() => () => GlobalState.inSettingsPage = false}>
    <div id="title" 
         slot="title">
        <div id="title-text">User Permissions</div>
    </div>
    
    <x-button slot="dialog-item"
              onclick=${async () => {
                    await navigator.clipboard.writeText(`${window.location.origin}/?code=${GlobalState.selectedWall.code}`)
                    showToast("Wall link copied to clipboard!")
                    self.shadowRoot.querySelector("secondary-header").closeSettingsDialog()
                }}>
        <x-icon icon="share" style="width: 20px"></x-icon>
        Copy Invite link
    </x-button>
</secondary-header>

<div id="users-list">
    ${() => GlobalState.selectedWall?.users
        .filter(user => user.id !== GlobalState.user.id)
        // .sort((user1, user2) => (user1.isAdmin && !user2.isAdmin) ? -1 : 1)
        .map(user => html(user)`
    <div class="user">
        <div class="nickname">${() => user.nickname}</div>
        ${() => user.isAdmin && html()`<div class="admin-badge">admin</div>`}
        <x-button class="toggle-admin-button"
                  onclick=${async () => {
                      await Api.setWallAdmin(user.id, !user.isAdmin)
                      user.isAdmin = !user.isAdmin
                  }}>
            ${() => user.isAdmin ? "Remove Admin" : "Make Admin"}
        </x-button>
    </div>
    `)}
</div>

<div></div>
`
})
