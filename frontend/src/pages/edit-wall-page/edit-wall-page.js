import {html, createYoffeeElement} from "../../../libs/yoffee/yoffee.min.js"
import {GlobalState, WallImage} from "../../state.js"
import {Api} from "../../api.js"
import {showAlert, showConfirm, showPrompt, showToast} from "../../../utilz/popups.js";
import {Bluetooth} from "../../bluetooth.js";
import {uploadImage} from "../../components/header.js";
import {GradingSystem} from "../../grades.js";
import {FILTER_TYPES} from "../routes-page/routes-filter.js";

function getLatestLedId() {
    let ledIds = []
    for (let hold of GlobalState.holds) {
        for (let ledId of hold.ledIds) {
            ledIds.push(ledId)
        }
    }
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
        editingHoldsMode: false,
        editingLedId: false,
        gradingSystem: GlobalState.selectedWall?.gradingSystem,
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
        if (showingUnusedHolds) {
            await clearAllHolds()
        }
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
        if (showingUnusedHolds) {
            await clearAllHolds()
        }
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
        if (state.editingHoldsMode) {
            if (state.selectedHold != null) {
                await unselectHold(state.selectedHold)
                state.selectedHold = null
            }

            let {x, y} = self.shadowRoot.querySelector("wall-element").convertPointToWallPosition(e.pageX, e.pageY)
            let newHold = await createHold(x, y)
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
        if (await showConfirm("Delete the selected hold?")) {
            await Api.deleteHold(hold.id)
            GlobalState.holdMapping.delete(hold.id)
            GlobalState.holds = GlobalState.holds.filter(h => h.id !== hold.id)
            state.selectedHold = null
            showToast("Deleted hold")
        }
    }

    async function setHoldLedIds(hold, ledIds) {
        if (updatingLED) {
            return
        }
        updatingLED = true
        try {
            await unselectHold(hold)
            await Api.setHoldLeds(hold.id, ledIds)
            hold.ledIds = ledIds
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
                if ((state.selectedHold.ledIds || []).length === 0) {
                    showToast("This hold is not assigned a LED")
                    return
                }
                await Bluetooth.setHoldState(state.selectedHold)
                state.highlightingLed = true
            } else if (!GlobalState.bluetoothConnected) {
                await Bluetooth.connectToWall()
            }
        }
    }

    async function setHoldDiameter(hold, diameter) {
        hold.diameter = diameter
        await Api.setHoldDiameter(hold.id, diameter)
    }

    async function setDefaultHoldDiameter(holdDiameter) {
        if (holdDiameter !== GlobalState.defaultHoldDiameter) {
            GlobalState.selectedWall.defaultHoldDiameter = holdDiameter
            GlobalState.defaultHoldDiameter = holdDiameter
            // GlobalState.holds.forEach(h => h.diameter = GlobalState.selectedWall.defaultHoldDiameter)
            await Api.setWallDefaultHoldDiameter(holdDiameter)
        }
    }

    let showingUnusedHolds = false
    async function showUnusedHolds() {
        if (showingUnusedHolds) {
            await clearAllHolds()
            return
        }
        // unselect selected hold
        if (state.selectedHold != null) {
            await unselectHold(state.selectedHold)
            state.selectedHold = null
        }

        // find unused holds
        let holdsInRoutes = new Set()
        for (let route of GlobalState.routes) {
            for (let hold of route.holds) {
                holdsInRoutes.add(hold.id)
            }
        }
        let unusedHolds = []
        for (let hold of GlobalState.holds) {
            if (!holdsInRoutes.has(hold.id)) {
                unusedHolds.push(hold)
            }
        }
        for (let hold of unusedHolds) {
            hold.inRoute = true
            hold.holdType = "finish"
            if (state.highlightingLed) {
                await Bluetooth.setHoldState(hold)
            }
        }

        showingUnusedHolds = unusedHolds.length > 0
        await showAlert(
            "Unused Holds",
            {text: unusedHolds.length === 0 ? "No unused holds, congratz!" : `Showing ${unusedHolds.length} unused holds`}
        )
    }

    async function clearAllHolds() {
        for (let hold of GlobalState.holds) {
            hold.inRoute = false
            hold.holdType = ""
            if (state.highlightingLed) {
                await Bluetooth.setHoldState(hold)
            }
        }
        showingUnusedHolds = false
    }

    async function setWallGradingSystem(gradingSystem) {
        GlobalState.loading = true
        try {
            await Api.setWallGradingSystem(gradingSystem)
            GlobalState.selectedWall.gradingSystem = gradingSystem
            state.gradingSystem = gradingSystem
            if (GlobalState.filters.find(f => f.type === FILTER_TYPES.GRADE)) {
                GlobalState.filters = GlobalState.filters.filter(f => f.type !== FILTER_TYPES.GRADE)
            }
        } finally {
            GlobalState.loading = false
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
        min-width: fit-content;
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
    
    #configure-hold-button {
        margin-left: auto;
        transition: 300ms;
        color: var(--text-color-on-secondary);
        cursor: pointer;
        padding: 10px 0 10px 10px;;
        font-size: 18px;
        border-bottom: 3px solid #00000000;
        display: flex;
        -webkit-tap-highlight-color: transparent;
    }
    
    #hold-settings-dialog {
        padding: 20px 5px;
        color: var(--text-color);
        background-color: var(--background-color); 
        width: max-content;
        overflow-y: auto;
        max-height: 80%;
        font-size: 16px;
    }
    
    #hold-settings-container {
        display: flex;
        flex-direction: column;
        align-items: baseline;
    }
    
    #hold-settings-container > .settings-item {
        padding: 10px 20px;
        justify-content: flex-start;
        display: flex;
        align-items: center;
        min-height: 24px;
    }
    
    #hold-settings-container > .settings-item > x-icon {
        width: 20px;
        margin-right: 10px;
    }
    
    #hold-settings-container > x-button {
        --overlay-color: rgb(var(--text-color-rgb), 0.1);
        --ripple-color: rgb(var(--text-color-rgb), 0.3);
        box-shadow: none;
        color: var(--text-color);
        width: -webkit-fill-available;
        gap: 10px;
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
    
    #unlink-led-button {
        padding: 5px 0 5px 7px;
        font-size: 16px;
        margin-right: 10px;
        width: fit-content;
        box-shadow: none;
        border-left: 1px solid var(--text-color-on-secondary-weak);
        border-radius: 0;
    }
    
    wall-element {
    
    }
    
    #upload-image-button {
        display: flex;
        gap: 14px;
        box-shadow: none;
        border: 3px dashed var(--text-color-weak-3);
        border-radius: 20px;
        margin: auto 20px;
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

${() => state.editingHoldsMode && html()`
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

<secondary-header hidebackbutton=${() => state.editingHoldsMode}
                  showxbutton=${() => state.selectedHold != null && !state.editingLedId}
                  showconfirmbutton=${() => state.editingLedId}
                  xbuttonclicked=${() => () => toggleHold(state.selectedHold)}>
    <div id="title" 
         slot="title"
         style="overflow: auto;">
        ${() => state.selectedHold == null && html()`<div id="title-text">${() => state.editingHoldsMode ? "Tap anywhere to set hold" : "Configuring wall"}</div>`}
        ${() => state.selectedHold != null && html(state.selectedHold)`
        <div id="led-config-container">
            ${() => state.selectedHold.ledIds.length > 0 && html()`<div>LEDs:</div>`}
            
            ${() => state.selectedHold.ledIds.map(ledId => html()`
            <div id="led-input-container">
                <x-button class="cycle-led-button"
                          onclick=${() => setHoldLedIds(state.selectedHold, [...state.selectedHold.ledIds.filter(id => id !== ledId), ledId - 1])}>
                    <x-icon icon="arrow_left"></x-icon>
                </x-button>
                <text-input id="led-id-input"
                            type="number" 
                            step="1"
                            pattern="\d+"
                            class="header-input"
                            slot="title"
                            value=${() => ledId}
                            changed=${() => async () => {
                                let newLedId = self.shadowRoot.querySelector("#led-id-input").getValue()
                                await setHoldLedIds(state.selectedHold, [...state.selectedHold.ledIds.filter(id => id !== ledId), parseInt(newLedId)])
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
                          onclick=${() => setHoldLedIds(state.selectedHold, [...state.selectedHold.ledIds.filter(id => id !== ledId), ledId + 1])}>
                    <x-icon icon="arrow_right"></x-icon>
                </x-button>
                <x-button id="unlink-led-button"
                      onclick=${async () => {
                            if (await showConfirm("Unlink the LED from the hold?", {text: "You can reassign any LED later"})) {
                                await setHoldLedIds(state.selectedHold, state.selectedHold.ledIds.filter(id => id !== ledId))
                            }
                        }}>
                <x-icon icon="close"></x-icon>
            </x-button>
            </div>
            `)}
            <x-button id="assign-led-button"
                      onclick=${() => setHoldLedIds(state.selectedHold, [...state.selectedHold.ledIds, getLatestLedId()])}>
                ${() => state.selectedHold.ledIds.length === 0 ? "Assign LED" : "Add LED"}
                <x-icon icon="lightbulb_2"></x-icon>
            </x-button>
        </div>
        <div id="configure-hold-button"
             tabindex="0"
             onkeydown=${() => e => e.stopPropagation()}
             onmousedown=${() => () => {
                let _dropdown = self.shadowRoot.querySelector("#hold-settings-dialog")
                let _button = self.shadowRoot.querySelector("#configure-hold-button")
                _dropdown.toggle(_button, true)
             }}
             onblur=${() => requestAnimationFrame(() => self.shadowRoot.querySelector("#hold-settings-dialog")?.close())}>
            <x-icon icon="settings"></x-icon>
        </div>
        <x-dialog id="hold-settings-dialog">
            <div id="hold-settings-container">
                <x-button class="settings-item"
                          onclick=${async () => {
                            let holdGroup = await showPrompt(
                                "Set the wall hold group for this hold",
                                {
                                    text: "Wall hold groups are used used for differentiating between multiple walls, for example if you have two boards and want to control both with the same controller and app. Routes in one wall will not vanish routes from other walls when switched.",
                                    placeholder: "Leave empty for default",
                                    label: "Wall name:",
                                    value: state.selectedHold.group,
                                    confirmButtonText: "Set wall"
                                }
                            )
                    
                            if (holdGroup != null) {
                                if (holdGroup === "") {
                                    await Api.setHoldGroup(state.selectedHold.id, null)
                                } else {
                                    await Api.setHoldGroup(state.selectedHold.id, holdGroup)
                                }
                                state.selectedHold.group = holdGroup
                            }
                        }}>
                    <x-icon icon="numbers" style="width: 20px;"></x-icon>
                    Wall: ${() => state.selectedHold.group || "Default"}
                </x-button>
                <x-button class="settings-item">
                    <x-icon icon="circle" style="width: 20px;"></x-icon>
                    Hold size:
                    <x-button style="margin-left: auto;padding: 0 5px;"
                              onclick=${() => setHoldDiameter(state.selectedHold, (state.selectedHold.diameter || GlobalState.defaultHoldDiameter) - 1)}>
                        <x-icon icon="arrow_left"></x-icon>
                    </x-button>
                    ${() => state.selectedHold.diameter || GlobalState.defaultHoldDiameter}
                    <x-button style="padding: 0 5px;"
                              onclick=${() => setHoldDiameter(state.selectedHold, (state.selectedHold.diameter || GlobalState.defaultHoldDiameter) + 1)}>
                        <x-icon icon="arrow_right"></x-icon>
                    </x-button>
                </x-button>
                <x-button class="settings-item"
                          onclick=${() => {
                              let routes = GlobalState.routes.filter(r => r.holds.some(hold => hold.id === state.selectedHold.id))
                              showAlert("Routes with this hold", {html: routes.map(r => r.name).join("<br>") || "No routes"})
                          }}>
                    <x-icon icon="view_list" style="width: 20px;"></x-icon>
                    Show routes with this hold
                </x-button>
                <x-button class="settings-item"
                          onclick=${() => deleteHold(state.selectedHold)}>
                    <x-icon icon="delete" style="width: 20px;"></x-icon>
                    Delete hold
                </x-button>
            </div>
        </x-dialog>
        `}
    </div>
    
    <x-button slot="dialog-item"
              id="rename-wall"
              onclick=${async () => {
                    let newWallName = await showPrompt(
                        "How would you like to call your wall?", {
                            placeholder: "Wall name",
                            confirmButtonText: "Rename"
                        })
                    if (newWallName != null && newWallName.trim() !== "") {
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
        <x-icon icon="edit" style="width: 20px;"></x-icon>
        Rename wall
    </x-button>
    <x-button slot="dialog-item"
              onclick=${() => uploadImage()}>
        <x-icon icon="image_arrow_up" style="width: 20px;"></x-icon>
        Change wall image
    </x-button>
    <x-button slot="dialog-item"
              onclick=${async () => {
                    let brightness = parseInt(await showPrompt("Set brightness", {
                        type: "range",
                        inputAttributes: {
                            min: "0",
                            max: "100",
                            step: "1"
                        },
                        value: Math.floor((GlobalState.selectedWall.brightness / 255) * 100)
                    }))
                    if (!isNaN(brightness)) {
                        let realBrightness = Math.round((brightness / 100) * 255)
                        await Bluetooth.setWallBrightness(realBrightness)
                        await Api.setWallBrightness(realBrightness)
                        GlobalState.selectedWall.brightness = realBrightness
                        GlobalState.selectedWall = {...GlobalState.selectedWall}
                    }
                }}>
        <x-icon icon="lightbulb" style="width: 20px;"></x-icon>
        LED Brightness:
        <div style="margin-left: auto">
            ${() => Math.round((GlobalState.selectedWall?.brightness / 255) * 100)}%
        </div>
    </x-button>
    <div slot="dialog-item">
        <x-icon icon="circle" style="width: 20px;"></x-icon>
        Default hold size:
        <x-button style="margin-left: auto; padding: 0 5px;"
                  onclick=${() => setDefaultHoldDiameter(GlobalState.defaultHoldDiameter - 1)}>
            <x-icon icon="arrow_left"></x-icon>
        </x-button>
        ${() => GlobalState.defaultHoldDiameter}
        <x-button style="padding: 0 5px;"
                  onclick=${() => setDefaultHoldDiameter(GlobalState.defaultHoldDiameter + 1)}>
            <x-icon icon="arrow_right"></x-icon>
        </x-button>
    </div>
    
    ${() => state.selectedHold != null && html(GlobalState.selectedWall)`
    <x-button slot="dialog-item"
              onclick=${async () => {
                  let holdGroup = await showPrompt(
                      "Set the wall hold group for this hold",
                      {
                          text: "Wall hold groups are used used for differentiating between multiple walls, for example if you have two boards and want to control both with the same controller and app. Routes in one wall will not vanish routes from other walls when switched.",
                          placeholder: "Leave empty for default",
                          label: "Wall name:",
                          value: state.selectedHold.group,
                          confirmButtonText: "Set wall"
                      }
                  )
                  
                  if (holdGroup != null) {
                      if (holdGroup === "") {
                          await Api.setHoldGroup(state.selectedHold.id, null)
                      } else {
                          await Api.setHoldGroup(state.selectedHold.id, holdGroup)
                      }
                      state.selectedHold.group = holdGroup
                  }
            }}>
        <x-icon icon="numbers" style="width: 20px;"></x-icon>
        Wall: ${() => state.selectedHold.group || "Default"}
    </x-button>
    `}
    
    <x-button slot="dialog-item"
              onclick=${() => showUnusedHolds()}>
        <x-icon icon="radio_button_unchecked" style="width: 20px;"></x-icon>
        Show unused holds
    </x-button>
    <div slot="dialog-item">
        <x-icon icon="scale" style="width: 20px;"></x-icon>
        Grading System: 
        <x-button style="margin-left: auto; padding: 0 5px;
                         ${() => state.gradingSystem === GradingSystem.FONT_SCALE ? "background-color: var(--secondary-color)" : ""}"
                  onclick=${() => setWallGradingSystem(GradingSystem.FONT_SCALE)}>
            Font
        </x-button>
        <x-button style="padding: 0 5px;
                         ${() => state.gradingSystem !== GradingSystem.FONT_SCALE ? "background-color: var(--secondary-color)" : ""}"
                  onclick=${() => setWallGradingSystem(GradingSystem.V_SCALE)}>
            V-Scale
        </x-button>
    </div>
    <x-button slot="dialog-item"
              onclick=${() => showAlert("Coming soon!")}>
        <x-icon icon="brush" style="width: 20px;"></x-icon>
        Edit colors
    </x-button>
</secondary-header>

${() => WallImage != null && html()`
<wall-element showallholds
              draggingholds=${() => state.editingHoldsMode}
              style=${() => state.editingHoldsMode ? "opacity: 0.6;" : "opacity: 1;"}
              ondraghold=${e => holdDragged(e.detail.hold, e.detail.x, e.detail.y)}
              ondragholdfinish=${e => holdDragFinished(e.detail.hold)}
              onclickhold=${e => holdClicked(e.detail.hold, e.detail.long)}
              onclick=${e => wallClicked(e)}>
</wall-element>
`}

${() => WallImage == null && html()`
<x-button id="upload-image-button" onclick=${() => uploadImage()}>
    <x-icon icon="image_arrow_up"></x-icon>
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
        <x-icon icon="delete"></x-icon>
    </x-button>
    <x-button id="plus-button"
              cancel-mode=${() => state.editingHoldsMode}
              onclick=${async () => {
                  if (state.editingHoldsMode) {
                      state.editingHoldsMode = false
                  } else {
                      if (state.selectedHold != null) {
                          await unselectHold(state.selectedHold)
                          state.selectedHold = null
                      }
                      state.editingHoldsMode = true
                  }
              }}>
        ${() => state.editingHoldsMode ? html()`
        Finish
        <x-icon icon="close"></x-icon>
        ` : html()`
        Add or move holds
        <x-icon icon="add"></x-icon>
        `}
    </x-button>
    
    <x-button id="turn-on-leds-button"
              active=${() => state.highlightingLed}
              onclick=${() => toggleHighlightingLed()}>
        <x-icon icon="lightbulb_2"></x-icon>
    </x-button>
</div>
`
})
