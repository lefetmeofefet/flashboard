import {html, createYoffeeElement} from "../../libs/yoffee/yoffee.min.js"
import {GlobalState, WallImage} from "../state.js"
import {Api} from "../api.js"
import {showToast} from "../../utilz/toaster.js";
import {Bluetooth} from "../bluetooth.js";
import "../components/text-input.js"
import "../components/x-button.js"
import "../components/x-tag.js"
import {uploadImage} from "../header.js";

function getLatestLedId() {
    let ledIds = GlobalState.holds.map(hold => hold.ledId).filter(ledId => ledId != null)
    if (ledIds.length === 0) {
        return 0
    }
    let maxLedId = Math.max(...ledIds)
    if (maxLedId == null || isNaN(maxLedId)) {
        return 0
    } else {
        return maxLedId + 1
    }
}

createYoffeeElement("edit-wall-page", (props, self) => {
    let updatingLED = false
    const state = {
        selectedHold: null,
        highlightingLed: GlobalState.autoLeds,
        placingHoldMode: false,
        editingLedId: false
    }

    async function holdDragged(hold, x, y) {
        hold.x = x
        hold.y = y
    }

    async function holdDragFinished(hold) {
        await Api.moveHold(hold.id, hold.x, hold.y)
    }

    async function holdClicked(hold, isLongPress) {
        if (isLongPress) {
            return
        }

        for (let h of GlobalState.holds.filter(h => h !== hold)) {
            if (h.inRoute) {
                await unselectHold(h)
            }
        }

        await toggleHold(hold)
    }

    async function toggleHold(hold) {
        hold.inRoute = !hold.inRoute
        hold.holdType = ""
        if (state.highlightingLed) {
            await Bluetooth.setHoldState(hold)
        }
        if (hold.inRoute) {
            state.selectedHold = hold
        } else {
            state.selectedHold = null
        }
    }

    async function unselectHold(hold) {
        hold.inRoute = false
        hold.holdType = ""
        if (state.highlightingLed) {
            await Bluetooth.setHoldState(hold)
        }
    }

    async function wallClicked(e) {
        if (GlobalState.loading) {
            return
        }
        if (state.placingHoldMode) {
            if (state.selectedHold != null) {
                await unselectHold(state.selectedHold)
                state.selectedHold = null
            }

            let {x, y} = self.shadowRoot.querySelector("wall-element").convertPointToWallPosition(e.pageX, e.pageY)
            let newHold = await createHold(x, y)
            // state.placingHoldMode = false
            await toggleHold(newHold)
        }
    }

    async function createHold(x, y) {
        let {hold} = await Api.createHold(x, y)
        GlobalState.holdMapping.set(hold.id, hold)
        GlobalState.holds = [...GlobalState.holds, hold]
        if (GlobalState.holds.length === 1) {
            showToast("Hold created! Drag holds to adjust their position")
        } else {
            showToast("New hold created!")
        }
        return hold
    }

    async function deleteHold(hold) {
        // Check if the hold is in a route
        let routes = GlobalState.routes.filter(
            route => route.holds.find(holdInRoute => holdInRoute.id === hold.id) != null
        )
        if (routes.length !== 0) {
            showToast(
                `Hold exists in ${routes.length} routes already: ${routes.map(r => r.name).join(", ")}`,
                {error: true}
            )
            return
        }
        if (confirm("Delete the selected hold?")) {
            await Api.deleteHold(hold.id)
            GlobalState.holdMapping.delete(hold.id)
            GlobalState.holds = GlobalState.holds.filter(h => h.id !== hold.id)
            state.selectedHold = null
            showToast("Deleted hold")
        }
    }

    async function setHoldLedId(hold, ledId) {
        if (ledId == null && !confirm("Unlink the LED from the hold? you can reassign any LED later")) {
            return
        }
        if (updatingLED) {
            return
        }
        updatingLED = true
        try {
            await unselectHold(hold)
            await Api.setHoldLed(hold.id, ledId)
            hold.ledId = ledId
            await toggleHold(hold)
        } finally {
            updatingLED = false
        }
    }

    async function toggleHighlightingLed() {
        if (state.highlightingLed) {
            await Bluetooth.clearLeds()
            state.highlightingLed = false
        } else {
            if (state.selectedHold != null) {
                await Bluetooth.setHoldState(state.selectedHold)
                state.highlightingLed = true
            } else {
                if (!GlobalState.bluetoothConnected) {
                    await Bluetooth.connectToWall()
                }
            }
        }
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
    
    #led-config-container {
        display: flex;
        align-items: center;
        overflow: hidden;
        white-space: nowrap;
        width: -webkit-fill-available;
        gap: 6px;
    }
    
    #led-config-container > #assign-led-button {
        gap: 5px;
        padding: 5px 10px;
        box-shadow: none;
        border: 1px solid var(--text-color-on-secondary-weak);
        border-radius: 100px;
        font-size: 18px;
    }
    
    #led-config-container > #led-input-container {
        display: flex;
        align-items: center;
        border: 1px solid var(--text-color-on-secondary-weak);
        border-radius: 100px;
        overflow: hidden;
    }
    
    #led-config-container > #led-input-container > .cycle-led-button {
        padding: 8px 10px;
        height: 21px;
        font-size: 16px;
        box-shadow: none;
    }
    
    #led-config-container > #led-input-container > #led-id-input {
        width: -webkit-fill-available;
        max-width: 39px;
        padding: 0 3px;
        text-align: center;
    }
    
    #led-config-container > #unlink-led-button {
        padding: 5px 0;
        gap: 5px;
        font-size: 16px;
        margin-right: 10px;
        margin-left: auto;
        width: fit-content;
        box-shadow: none;
    }
    
    wall-element {
    
    }
    
    #upload-image-button {
        display: flex;
        gap: 14px;
        box-shadow: none;
        border: 3px dashed var(--text-color-weak-3);
        border-radius: 20px;
        margin: 20px 20px 50% 20px;
        padding: 30px 20px;
        width: fit-content;
        align-self: center;
        --overlay-color: var(--hover-color);
        --ripple-color: var(--hover-color);
    }
    
    #upload-image-button > x-icon {
        font-size: 30px;
        padding: 20px;
        border-radius: 100px;
        min-width: 50px;
        min-height: 50px;
        
        background-color: var(--secondary-color);
        color: var(--text-color-on-secondary);
        background-color: var(--background-color-3);
        color: var(--text-color-weak);
    }
    
    #upload-image-button > #upload-description {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }
    
    #upload-image-button > #upload-description > #upload-text {
        font-size: 18px;
        color: var(--text-color);
    }
    
    #upload-image-button > #upload-description > #upload-tip {
        font-size: 14px;
        color: var(--text-color-weak-1);
    }
    
    #bottom-buttons {
        display: flex;
        align-items: center;
        justify-content: space-evenly;
        height: 50px;
        min-height: 44px;
    }
    
    #bottom-buttons > x-button {
        border-radius: 1000px;
        color: var(--text-color-weak);
        background-color: var(--background-color-3);
        width: 20px;
        height: 20px;
        gap: 10px;
    }
    
    #bottom-buttons > #delete-button {
        background-color: var(--danger-zone-color);
        color: var(--text-color-on-secondary);
    }
    
    #bottom-buttons > #delete-button[data-hidden] {
        visibility: hidden;
    }
    
    #bottom-buttons > #plus-button {
        background-color: var(--secondary-color);
        color: var(--text-color-on-secondary);
        width: fit-content;
    }
    
    #bottom-buttons > #plus-button[cancel-mode] {
        color: var(--text-color-weak);
        background-color: var(--background-color-3);
    }
    
    #bottom-buttons > #turn-on-leds-button[active] {
        background-color: var(--secondary-color);
        color: var(--text-color-on-secondary);
    }
    
    yoffee-list-location-marker {
        display: none;
    }
</style>

${() => state.placingHoldMode && html()`
<style>
    wall-element {
        cursor: crosshair;
    }
</style>
`}

${() => WallImage == null && html()`
<style>
    #bottom-buttons {
        visibility: hidden;
    }
</style>
`}

<secondary-header hidebackbutton=${() => state.placingHoldMode}
                  showxbutton=${() => state.selectedHold != null && !state.editingLedId}
                  showconfirmbutton=${() => state.editingLedId}
                  xbuttonclicked=${() => () => toggleHold(state.selectedHold)}>
    <div id="title" 
         slot="title">
        ${() => state.selectedHold == null && html()`<div id="title-text">${() => state.placingHoldMode ? "Tap anywhere to set hold" : "Configuring wall"}</div>`}
        ${() => state.selectedHold != null && html(state.selectedHold)`
        <div id="led-config-container">
            ${() => state.selectedHold?.ledId == null ? html()`
            <x-button id="assign-led-button"
                      onclick=${() => setHoldLedId(state.selectedHold, getLatestLedId())}>
                Assign LED
                <x-icon icon="fa fa-lightbulb"></x-icon>
            </x-button>
            ` : html()`
            <div>LED:</div>
            
            <div id="led-input-container">
                <x-button class="cycle-led-button"
                          onclick=${() => setHoldLedId(state.selectedHold, state.selectedHold.ledId - 1)}>
                    <x-icon icon="fa fa-caret-left"></x-icon>
                </x-button>
                <text-input id="led-id-input"
                            type="number" 
                            step="1"
                            pattern="\d+"
                            class="header-input"
                            slot="title"
                            value=${() => state.selectedHold?.ledId}
                            changed=${() => async () => {
                                let ledId = self.shadowRoot.querySelector("#led-id-input").getValue()
                                setHoldLedId(state.selectedHold, parseInt(ledId))
                            }}
                            onblur=${() => state.editingLedId = false}
                            onfocus=${e => {
                                if (!e.target.selected) {
                                    e.target.select()
                                    state.editingLedId = true
                                }
                            }}
                ></text-input>
                <x-button class="cycle-led-button"
                          onclick=${() => setHoldLedId(state.selectedHold, state.selectedHold.ledId + 1)}>
                    <x-icon icon="fa fa-caret-right"></x-icon>
                </x-button>
            </div>
            
            <x-button id="unlink-led-button"
                      onclick=${() => setHoldLedId(state.selectedHold, null)}>
                <x-icon icon="fa fa-unlink"></x-icon>
            </x-button>
            `}
        </div>
        `}
    </div>
    
    <x-button slot="dialog-item"
              id="rename-wall"
              onclick=${async () => {
                    let newWallName = prompt("What would you like to call your wall?")
                    if (newWallName != null) {
                        GlobalState.loading = true
                        try {
                            await Api.setWallName(newWallName)
                            GlobalState.selectedWall.name = newWallName
                            GlobalState.selectedWall = {...GlobalState.selectedWall}
                            if (GlobalState.bluetoothConnected) {
                                await Bluetooth.setWallName(newWallName)
                            }
                        } finally {
                            GlobalState.loading = false
                        }
                    }
                }}>
        <x-icon icon="fa fa-edit" style="width: 20px;"></x-icon>
        Rename wall
    </x-button>
    <x-button slot="dialog-item"
              onclick=${() => uploadImage()}>
        <x-icon icon="fa fa-cloud-upload-alt" style="width: 20px;"></x-icon>
        Change wall image
    </x-button>
    <x-button slot="dialog-item"
              onclick=${async () => {
                    let brightness = parseInt(prompt("Enter brightness from 0 to 100: "))
                    if (!isNaN(brightness)) {
                        let realBrightness = Math.round((brightness / 100) * 255)
                        await Bluetooth.setWallBrightness(realBrightness)
                        await Api.setWallBrightness(realBrightness)
                        GlobalState.selectedWall.brightness = realBrightness
                        GlobalState.selectedWall = {...GlobalState.selectedWall}
                    }
                }}>
        <x-icon icon="fa fa-lightbulb" style="width: 20px;"></x-icon>
        Brightness:
        <div style="margin-left: auto">
            ${() => Math.round((GlobalState.selectedWall?.brightness / 255) * 100)}%
        </div>
    </x-button>
    <x-button slot="dialog-item"
              onclick=${() => alert("Coming soon!")}>
        <x-icon icon="fa fa-paint-brush" style="width: 20px;"></x-icon>
        Edit colors
    </x-button>
</secondary-header>

<wall-element showallholds
              style=${() => state.placingHoldMode ? "opacity: 0.6;" : "opacity: 1;"}
              ondraghold=${e => holdDragged(e.detail.hold, e.detail.x, e.detail.y)}
              ondragholdfinish=${e => holdDragFinished(e.detail.hold)}
              onclickhold=${e => holdClicked(e.detail.hold, e.detail.long)}
              onclick=${e => wallClicked(e)}>
</wall-element>

${() => WallImage == null && html()`
<x-button id="upload-image-button" onclick=${() => uploadImage()}>
    <x-icon icon="fa fa-cloud-upload-alt"></x-icon>
    <div id="upload-description">
        <div id="upload-text">Upload your wall image</div>
        <div id="upload-tip">Tip: use CamScanner original setting for a clean image</div>
    </div>
</x-button>
`}

<div id="bottom-buttons">
    <x-button id="delete-button"
              data-hidden=${() => state.selectedHold == null}
              onclick=${() => deleteHold(state.selectedHold)}>
        <x-icon icon="fa fa-trash"></x-icon>
    </x-button>
    <x-button id="plus-button"
              cancel-mode=${() => state.placingHoldMode}
              onclick=${async () => {
                  if (state.placingHoldMode) {
                      state.placingHoldMode = false
                  } else {
                      if (state.selectedHold != null) {
                          await unselectHold(state.selectedHold)
                          state.selectedHold = null
                      }
                      state.placingHoldMode = true
                  }
              }}>
        ${() => state.placingHoldMode ? html()`
        Finish
        <x-icon icon="fa fa-times"></x-icon>
        ` : html()`
        Add hold
        <x-icon icon="fa fa-plus"></x-icon>
        `}
    </x-button>
    
    <x-button id="turn-on-leds-button"
              active=${() => state.highlightingLed}
              onclick=${() => toggleHighlightingLed()}>
        <x-icon icon="fa fa-lightbulb"></x-icon>
    </x-button>
</div>
`
})
