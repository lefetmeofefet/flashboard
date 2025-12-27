import {html, createYoffeeElement} from "../../libs/yoffee/yoffee.min.js"
import {
    GlobalState,
    loadRoutesAndHolds,
    enterConfigureHoldsPage,
    exitWall, snakeMeUp, setAutoLeds, updateTheme, signOut, isAdmin
} from "../state.js";
import {Api} from "../api.js";
import {showConfirm, showPrompt, showToast} from "../../utilz/popups.js";
import {loadFile} from "../../utilz/load-file.js";
import {Bluetooth} from "../bluetooth.js";
import {enterFullscreen, exitFullscreen, isFullScreen} from "../../utilz/fullscreen.js";
import {debounce} from "../../utilz/debounce.js";


let uploadImage = async () => {
    GlobalState.loading = true
    try {
        let file = await loadFile("image/*")
        console.log("Got file!")
        await Api.setWallImage(file)
        await loadRoutesAndHolds(true)
        showToast("Image updated!")
    } catch(e) {
    } finally {
        GlobalState.loading = false
    }
}


createYoffeeElement("header-bar", (props, self) => {
    let state = {
        searchMode: false
    }

    function adjustTitleSize(repeated) {
        let title = self.shadowRoot.querySelector("#title")
        if (title == null) {
            return
        }
        const TITLE_WIDTH_PX = 55
        let currentFontSize = parseFloat(window.getComputedStyle(title).fontSize)
        if (currentFontSize !== TITLE_WIDTH_PX){
            title.style.fontSize = `${TITLE_WIDTH_PX}px`
        }
        if (title != null && title.offsetWidth !== title.scrollWidth) {
            title.style.fontSize = Math.floor(TITLE_WIDTH_PX * (title.offsetWidth / title.scrollWidth)) + "px"
        }
        if (repeated == null) {
            // No need to repeat, I think. if stupid browsers will stop working, try this
            // requestAnimationFrame(() => adjustTitleSize(true))
        }
    }

    // Remember the filter value if going back to this page
    if (GlobalState.freeTextFilter != null) {
        state.searchMode = true
    }
    self.onConnect = () => {
        if (GlobalState.freeTextFilter != null && state.searchMode) {
            self.shadowRoot.querySelector("#search").setValue(GlobalState.freeTextFilter)
        }
    }

    const updateSearch = search => {
        search = search?.trim()
        if (search === "") {
            search = null
        }
        if (GlobalState.freeTextFilter != search) {
            GlobalState.freeTextFilter = search
        }
    }
    const updateSearchDebounce = debounce(updateSearch, 300)

    return html(GlobalState, state)`
<style>
    :host {
        position: relative;
        display: flex;
        gap: 15px;
        align-items: center;
        min-height: 83px;
    }
    
    #title {
        font-size: 55px;
        overflow: hidden;
        user-select: none;
        min-height: 36px;
        white-space: nowrap;
    }
    
    @media (max-width: 380px) {
        #title {
            font-size: 45px;
        }
    }
    
    text-input#search {
        min-width: 0; /* Used to not squish other elements*/
        width: -webkit-fill-available;
        background-color: var(--background-color-3);
        border-radius: 100px;
        padding: 3px 5px;
        --selection-background: var(--secondary-color-weak-2);
    }
    
    text-input#search > x-icon {
        padding: 10px;
        --caret-color: var(--text-color);
        border-radius: 100px;
        cursor: pointer;
        width: 18px;
        height: 18px;
    }
    
    text-input#search > x-icon:hover {
        background-color: var(--hover-color);
    }
    
    #refresh-button {
        border-radius: 1000px;
        color: var(--text-color-weak-1);
        width: 15px;
        min-width: 15px;
        height: 30px;
        background-color: var(--text-color-weak-3);
    }
    
    #search-button {
        border-radius: 1000px;
        color: var(--text-color-weak-1);
        width: 15px;
        min-width: 15px;
        height: 30px;
        background-color: var(--text-color-weak-3);
    }
    
    x-switch {
        --circle-color: var(--secondary-color);
    }
    
    #settings-button {
        transition: 300ms;
        color: var(--text-color);
        cursor: pointer;
        padding: 19px 10px;
        font-size: 18px;
        border-bottom: 3px solid #00000000;
        display: flex;
        -webkit-tap-highlight-color: transparent; /* Stops the blue background highlight */
        margin-left: auto;
        width: 15px;
        min-width: 15px;
    }
    
    #settings-button:hover {
        transition: 300ms;
        color: var(--secondary-color);
    }
    
    #settings-dialog {
        padding: 20px 5px;
        color: var(--text-color);
        background-color: var(--background-color); 
        width: max-content;
        overflow-y: auto;
        max-height: 80%;
    }
    
    #settings-container {
        display: flex;
        flex-direction: column;
        align-items: baseline;
    }
    
    #settings-container > #settings-title {
        display: flex;
        font-size: 20px;
        padding: 10px;
        align-self: center;
        align-items: center;
        white-space: nowrap;
    }
    
    #settings-container > #settings-title > #edit-nickname-button {
        border-radius: 100px;
        box-shadow: none;
        font-size: 16px;
        opacity: 0.5;
        color: var(--text-color);
        padding: 10px;
    }
    #settings-container > .settings-item {
        padding: 10px 20px;
        justify-content: flex-start;
        display: flex;
        align-items: center;
        min-height: 24px;
    }
    
    #settings-container > .settings-item > x-icon,
    #settings-container > .settings-item > .bt-icon {
        width: 20px;
        margin-right: 10px;
    }
    
    #settings-container > x-button {
        --overlay-color: rgb(var(--text-color-rgb), 0.1);
        --ripple-color: rgb(var(--text-color-rgb), 0.3);
        box-shadow: none;
        color: var(--text-color);
        width: -webkit-fill-available;
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
        background-color: var(--secondary-color);
        animation: loading 2s infinite;
        animation-play-state: ${() => GlobalState.loading ? "running" : "paused"};
        -moz-animation-play-state: ${() => GlobalState.loading ? "running" : "paused"};
        -o-animation-play-state: ${() => GlobalState.loading ? "running" : "paused"};
        -webkit-animation-play-state: ${() => GlobalState.loading ? "running" : "paused"};
        visibility: ${() => GlobalState.loading ? "visible" : "hidden"};
    }
    
    @keyframes loading {
        0% { width: 0; margin-left: 0; }
        50% { width: 100%; margin-left: 0; }
        100% { width: 0; margin-left: 100%; }
    }
</style>
` : html()`<style>:host::after { content: none !important; }</style>`}

${() => {
    let element = state.searchMode ? html()`
<text-input id="search"
            onfocus=${e => !e.target.selected && e.target.select()}
            oninput=${e => updateSearchDebounce(e.target.value)}
            onblur=${() => {
                if (state.searchMode && GlobalState.freeTextFilter == null) {
                    state.searchMode = false
                    updateSearch(null)
                }
            }}>
    <x-icon icon="arrow_back"
            slot="before"
            onclick=${() => {
                state.searchMode = false
                updateSearch(null)
            }}
    ></x-icon>
    ${() => GlobalState.freeTextFilter != null && html()`
    <x-icon icon="close"
            slot="after"
            onclick=${() => {
                let search = self.shadowRoot.querySelector("#search")
                search.setValue("")
                search.focus()
                updateSearch(null)
            }}
    ></x-icon>
    `}
</text-input>
` : html()`
<div id="title">
    ${() => GlobalState.selectedWall == null ? "FLASHBOARD" : GlobalState.selectedWall.name}
</div>
${() => GlobalState.selectedWall != null && html()`
<x-button id="refresh-button"
          onclick=${async () => await loadRoutesAndHolds()}>
    <x-icon icon="refresh" spin=${() => GlobalState.loading}></x-icon>
</x-button>
<x-button id="search-button"
          onclick=${() => {
              state.searchMode = true
              self.shadowRoot.querySelector("#search")?.focus()
          }}>
    <x-icon icon="search"></x-icon>
</x-button>
`}
`
    // adjust title size every time we render the title
    requestAnimationFrame(() => adjustTitleSize())
    return element
}}
    

<div id="settings-button" 
     tabindex="0"
     onkeydown=${() => e => e.stopPropagation()}
     onmousedown=${() => () => {
         let _dropdown = self.shadowRoot.querySelector("#settings-dialog")
         let _button = self.shadowRoot.querySelector("#settings-button")
         _dropdown.toggle(_button, true)
     }}
     onblur=${() => requestAnimationFrame(() => self.shadowRoot.querySelector("#settings-dialog").close())}>
    <x-icon icon="menu"></x-icon>
</div>

<x-dialog id="settings-dialog">
    <div id="settings-container">
        <div id="settings-title" onclick=${() => async () => {
                let newNickname = await showPrompt("Edit nickname", {
                    placeholder: "New nickname"
                })
                if (newNickname != null) {
                    await Api.setNickname(newNickname)
                    GlobalState.user = {...GlobalState.user, nickname: newNickname}
                    if (GlobalState.selectedWall != null) {
                        await loadRoutesAndHolds()
                    }
                }
            }}>
            Hi, ${() => GlobalState.user.nickname}!
            <x-button id="edit-nickname-button">
                <x-icon icon="edit"></x-icon>
            </x-button>
        </div>
        
        
        ${() => GlobalState.selectedWall != null && html()`
        
        ${() => !GlobalState.bluetoothConnected && html()`
        <x-button class="settings-item"
                  onclick=${() => Bluetooth.connectToWall()}>
            <x-icon icon="bluetooth"></x-icon>
            Connect to wall
        </x-button>
        `}
        <x-button class="settings-item"
                  onclick=${async () => {
                      await navigator.clipboard.writeText(`${window.location.origin}/?code=${GlobalState.selectedWall.code}`)
                      showToast("Wall link copied to clipboard!")
                      self.shadowRoot.querySelector("#settings-dialog").close()
                  }}>
            <x-icon icon="share"></x-icon>
            Copy Invite link
        </x-button>
        
        ${() => isAdmin() && html()`
        <x-button class="settings-item"
                  onclick=${() => enterConfigureHoldsPage()}>
            <x-icon icon="settings"></x-icon>
            Configure Wall
        </x-button>
        
        <x-button class="settings-item"
                  onclick=${() => GlobalState.inSettingsPage = true}>
            <x-icon icon="passkey"></x-icon>
            Manage user permissions
        </x-button>
        `}
        
        <x-button class="settings-item"
                  id="auto-leds"
                  onclick=${() => setAutoLeds(!GlobalState.autoLeds)}>
            <x-icon icon="bolt"></x-icon>
            <div>Auto leds</div>
            <x-switch value=${() => GlobalState.autoLeds}
                      style="--circle-size: 20px; margin-left: auto; padding-left: 10px;">
            </x-switch>
        </x-button>
        <x-button class="settings-item"
                  id="snakeio"
                  onclick=${() => snakeMeUp()}>
            <x-icon icon="question_mark"></x-icon>
            Snake me up
        </x-button>
        `}
        
        <x-button class="settings-item"
                  id="theme-toggle"
                  onclick=${() => updateTheme(!GlobalState.darkTheme)}>
            <x-icon icon=${() => GlobalState.darkTheme ? "dark_mode" : "light_mode"}></x-icon>
            <div>Theme:</div>
            <x-switch value=${() => GlobalState.darkTheme}
                      style="--circle-size: 20px; margin-left: auto; padding-left: 10px;">
                 ${() => GlobalState.darkTheme ? "dark" : "light"}
            </x-switch>
        </x-button>
        <x-button class="settings-item"
                  id="fullscreen"
                  onclick=${() => {
                      isFullScreen() ? exitFullscreen() : enterFullscreen();
                      self.shadowRoot.querySelector("#settings-dialog").close()
                  }}>
            <x-icon icon="fullscreen"></x-icon>
            Toggle fullscreen
        </x-button>
        
        ${() => GlobalState.selectedWall == null && html()`
        <x-button class="settings-item"
                  id="exit-wall"
                  onclick=${() => signOut()}>
            <x-icon icon="logout" style="transform: rotate(180deg)"></x-icon>
            Sign out
        </x-button>
        <x-button class="settings-item"
                  id="privacy-policy"
                  onclick=${() => showPrivacyPolicy()}>
            <x-icon icon="policy"></x-icon>
            Privacy Policy
        </x-button>
        `}
        
        ${() => (GlobalState.selectedWall?.macAddress != null && isAdmin()) && html()`
        <x-button class="settings-item"
                  id="unlink-wall"
                  onclick=${async () => {
                      await Api.setWallMacAddress(GlobalState.selectedWall.id, null)
                      GlobalState.selectedWall.macAddress = null
                      await exitWall()
                      showToast("Successfully unlinked wall from LED system!")
                  }}>
            <x-icon icon="sync_disabled"></x-icon>
            Unlink wall from LED sytem
        </x-button>
        `}
        ${() => GlobalState.selectedWall != null && isAdmin() && html()`
        <x-button class="settings-item"
                  id="delete-wall"
                  onclick=${async () => {
                      let wallName = GlobalState.selectedWall.name
                      let input = await showPrompt("Delete wall", {
                           
                          placeholder: "Wall name",
                          options: {
                              icon: "warning",
                              text: `Are you SURE you want to delete the wall ${GlobalState.selectedWall.name}? ALL data including routes and holds will be deleted. \nTo continue, enter the wall name.`
                          }
                      })
                      if (input === GlobalState.selectedWall.name) {
                          await Api.deleteWall(GlobalState.selectedWall.id)
                          showToast(`Successfully deleted the wall ${wallName}!`)
                          exitWall()
                      } else if (input != null) {
                          showToast("Wall name to delete wasn't entered correctly", {error: true})
                      }
                  }}>
            <x-icon icon="delete"></x-icon>
            Delete wall
        </x-button>
        `}
        <x-button class="settings-item"
                  id="delete-wall"
                  onclick=${() => window.open("https://discord.gg/x5gbeD6hcA", "_blank")}>
            <x-icon icon="chat"></x-icon>
            Contact Us
        </x-button>
        
        ${() => GlobalState.selectedWall == null && html()`
        <x-button class="settings-item"
                  id="delete-account"
                  onclick=${async () => {
                        let shouldDelete = await showConfirm("Are you sure you want to delete this account? This is irreversible.", {
                            confirmButtonColor: "red",
                            options: {
                                icon: "warning",
                            }
                        })
                        if (shouldDelete) {
                            await Api.deleteAccount()
                            window.location.reload()
                        }
                    }}>
            <x-icon icon="close""></x-icon>
            Delete Account
        </x-button>
        `}
    </div>
</x-dialog>
`
})

export {uploadImage}