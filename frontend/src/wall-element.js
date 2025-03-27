import {html, createYoffeeElement} from "../libs/yoffee/yoffee.min.js"
import {GlobalState, WallImage} from "./state.js"
import "./components/text-input.js"
import "./components/x-button.js"
import "./components/x-tag.js"
import {zoomify} from "./walls-page/zoomify.js";

const IMAGE_MODES = {
    CONTAIN: "CONTAIN",
    COVER: "COVER",
    STRETCH: "STRETCH"
}

createYoffeeElement("wall-element", (props, self) => {
    let state = {
        imageMode: localStorage.getItem("wall-image-mode") || IMAGE_MODES.CONTAIN,
    }

    // Dragging
    let clickedHold
    let dragging = false
    let dragStartPosition
    let dragContainer
    let longPressTimer
    let isAfterLongPress = false
    const MIN_DISTANCE_FOR_DRAG = 8
    const LONG_PRESS_TIME = 500

    let containerElement
    let imageElement
    self.onConnect = () => {
        dragContainer = self.shadowRoot.querySelector("#holds")
        containerElement = self.shadowRoot.querySelector("#container")
        imageElement = self.shadowRoot.querySelector("#image")
        imageElement.style.opacity = "0"
        imageElement.onload = () => {
            let xRatio = self.offsetWidth / imageElement.naturalWidth
            let yRatio = self.offsetHeight / imageElement.naturalHeight
            let ratio = Math.min(xRatio, yRatio)
            imageElement.width = imageElement.naturalWidth * ratio
            imageElement.height = imageElement.naturalHeight * ratio
            if (state.imageMode !== IMAGE_MODES.CONTAIN) {
                setImageMode(state.imageMode)
            }
            imageElement.style.opacity = "1"
        }
        imageElement.src = WallImage

        zoomify(
            containerElement,
            {
                parent: self,
                onZoom: () => {
                    if (state.imageMode === IMAGE_MODES.COVER) {
                        setImageMode(IMAGE_MODES.CONTAIN)
                    }
                }
            }
        )
    }

    self.shadowRoot.addEventListener('pointerup', async () => {
        clearTimeout(longPressTimer)

        if (clickedHold != null) {
            if (dragging) {
                self.dispatchEvent(new CustomEvent('dragholdfinish', {
                    detail: {
                        hold: clickedHold
                    }
                }))
            } else {
                await holdClicked(clickedHold)
            }
        }

        clickedHold = null
        dragging = false
    })

    function bound(value) {
        return Math.max(0, Math.min(1, value));
    }

    let isDistanceEnoughForDragging = (x, y) => {
        return Math.sqrt(
            Math.pow(x - dragStartPosition.x, 2) + Math.pow(y - dragStartPosition.y, 2)
        ) >= MIN_DISTANCE_FOR_DRAG
    }

    self.convertPointToWallPosition = (dragContainerX, dragContainerY) => {
        let {x, y, width, height} = dragContainer.getBoundingClientRect()
        return {
            x: bound((dragContainerX - x) / width),
            y: bound((height - dragContainerY + y) / height)
        }
    }

    self.shadowRoot.addEventListener('pointermove', (event) => {
        if (clickedHold != null) {
            if (!dragging && isDistanceEnoughForDragging(event.pageX, event.pageY)) {
                // We wait to make the click be dismissed because of dragging=true
                dragging = true
                clearTimeout(longPressTimer)
            }
            if (dragging) {
                event.preventDefault();
                let {x, y} = self.convertPointToWallPosition(event.pageX, event.pageY)
                self.dispatchEvent(new CustomEvent('draghold', {
                    detail: {
                        hold: clickedHold,
                        x,
                        y
                    }
                }))
            }
        }
    })

    const holdClicked = async hold => {
        console.log("normal click")
        if (isAfterLongPress) {
            // When releasing after long press we don't want a normal click to be registered
            isAfterLongPress = false
            return
        }

        self.dispatchEvent(new CustomEvent('clickhold', {detail: {hold}}))
    }

    const holdLongPressed = async hold => {
        console.log("long press")
        isAfterLongPress = true
        self.dispatchEvent(new CustomEvent('clickhold', {detail: {hold, long: true}}))
    }

    let setImageMode = mode => {
        localStorage.setItem("wall-image-mode", mode)
        state.imageMode = mode
        if (mode === IMAGE_MODES.CONTAIN) {
            containerElement.contain()
        } else if (mode === IMAGE_MODES.COVER) {
            containerElement.cover()
        } else if (mode === IMAGE_MODES.STRETCH) {
            containerElement.reset()
            imageElement.style.width = "100vw"
            imageElement.style.height = "100%"
            containerElement.style.height = "100%"
        }
    }

    const filterTouchEvent = e => {
        if (props.showallholds) {
            e.stopPropagation()
            e.preventDefault()
        }
    }

    return html(props, state)`
<style>
    :host {
        display: flex;
        height: inherit;
        /*position: relative;*/
        flex: 1;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: auto;
    }
    
    #container {
        display: flex;
        position: relative;
        overflow: hidden; /* for iphone shit */
        width: fit-content;
        height: fit-content;
    }
    
    #image {
        
    }
    
    #holds {
        position: absolute;
        touch-action: none;
        width: -webkit-fill-available;
        height: -webkit-fill-available;
        margin: 2%;
    }
    
    #holds > .hold {
        position: absolute;
        width: 26px;
        height: 26px;
        background-color: #00000040;
        border-radius: 100px;
        color: var(--text-color-on-secondary);
        transform: translate(-50%, 50%);
        /*opacity: 0.6;*/
        border: 3px solid transparent;
        border: 1px solid #ffffff50;
    }
    
    #holds > .hold:is([data-hold-type=hold], [data-hold-type=start], [data-hold-type=finish], [data-hold-type=foot]) {
        width: 34px;
        height: 34px;
        background-color: transparent;
        border-width: 3px;
    }
    
    #holds > .hold[data-hold-type=hold] {
        border-color: var(--secondary-color);
    }
    
    #holds > .hold[data-hold-type=start] {
        border-color: #20ff30;
    }
    
    #holds > .hold[data-hold-type=foot] {
        border-color: #ee20ee;
    }
    
    #holds > .hold[data-hold-type=finish] {
        border-color: #fa3344;
    }
    
    x-button#zoom-control-button {
        position: absolute;
        border-radius: 1000px;
        color: var(--text-color-on-secondary);
        height: 30px;
        background-color: var(--secondary-color);
        width: fit-content;
        min-width: 10px;
        bottom: 115px;
        right: 30px;
    }
</style>

<div id="container">
    <img id="image"/>
    <div id="holds"
         oncontextmenu = ${e => {
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
        }}>
        ${() => GlobalState.holds
            .filter(hold => props.showallholds || hold.inRoute)
            .map(hold => html(hold)`
        <div class="hold"
             data-hold-type=${() => hold.inRoute ? (hold.holdType === "" ? "hold" : hold.holdType) : ""}
             style="${() => `
                left: ${hold.x * 100}%; 
                bottom: ${hold.y * 100}%; 
                `}"
             onpointerdown=${e => {
                clickedHold = hold
                dragStartPosition = {x: e.pageX, y: e.pageY}
                e.stopPropagation()
                // e.preventDefault()
                longPressTimer = setTimeout(() => holdLongPressed(hold), LONG_PRESS_TIME)
            }}
             ontouchstart=${e => filterTouchEvent(e)}
             ontouchmove=${e => filterTouchEvent(e)}
             ontouchend=${e => filterTouchEvent(e)}
             >
        </div>
        `)}
    </div>
</div>
<x-button id="zoom-control-button"
          onclick=${() => {
                if (state.imageMode === IMAGE_MODES.CONTAIN) {
                    setImageMode(IMAGE_MODES.COVER)
                } else if (state.imageMode === IMAGE_MODES.COVER) {
                    setImageMode(IMAGE_MODES.STRETCH)
                } else if (state.imageMode === IMAGE_MODES.STRETCH) {
                    // Stop the stretch
                    imageElement.style.width = null
                    imageElement.style.height = null
                    containerElement.style.height = "fit-content"
                    setImageMode(IMAGE_MODES.CONTAIN)
                }
    }}>
    <x-icon icon=${() => state.imageMode === IMAGE_MODES.CONTAIN ? "fa fa-expand" : 
        (state.imageMode === IMAGE_MODES.COVER ? "fa fa-arrows-alt" : "fa fa-compress")}></x-icon>
</x-button>

`})
