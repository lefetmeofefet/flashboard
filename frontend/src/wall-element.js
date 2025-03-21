import {html, createYoffeeElement} from "../libs/yoffee/yoffee.min.js"
import {GlobalState, WallImage} from "./state.js"
import "./components/text-input.js"
import "./components/x-button.js"
import "./components/x-tag.js"

createYoffeeElement("wall-element", (props, self) => {
    // Dragging
    let clickedHold
    let dragging = false
    let dragStartPosition
    let dragContainer
    let longPressTimer
    let isAfterLongPress = false
    const MIN_DISTANCE_FOR_DRAG = 10
    const LONG_PRESS_TIME = 500

    self.onConnect = () => {
        dragContainer = self.shadowRoot.querySelector("#holds-container")
    }

    window.addEventListener('pointerup', async () => {
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

    window.addEventListener('pointermove', (event) => {
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

    return html(props)`
<style>
    :host {
        display: flex;
        height: inherit;
        position: relative;
        background-size: 100% 100%; /* Stretches the image to fit the div exactly */
        background-position: center; /* Centers the image in the div */
        background-repeat: no-repeat; /* Prevents tiling */
        background-color: transparent;
        max-width: 75vh;
        align-self: center;
        flex: 1;
        overflow: hidden; /* for iphone shit */
        width: 100%;
    }
    
    #holds-container {
        position: relative;
        margin: 2%;  /* Must be percentage to keep hold positions same across different screen sizes */
        height: auto;
        touch-action: none;
        width: -webkit-fill-available;
    }
    
    #holds-container > .hold {
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
    
    #holds-container > .hold:is([data-hold-type=hold], [data-hold-type=start], [data-hold-type=finish], [data-hold-type=foot]) {
        width: 34px;
        height: 34px;
        background-color: transparent;
        border-width: 3px;
    }
    
    #holds-container > .hold[data-hold-type=hold] {
        border-color: var(--secondary-color);
    }
    
    #holds-container > .hold[data-hold-type=start] {
        border-color: #20ff30;
    }
    
    #holds-container > .hold[data-hold-type=foot] {
        border-color: #ee20ee;
    }
    
    #holds-container > .hold[data-hold-type=finish] {
        border-color: #fa3344;
    }
    
</style>

<style>
    :host {
        background-image: ${WallImage == null ? null : `url(${WallImage})`};
    }
</style>

<div id="holds-container"
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
         >
    </div>
    `)}
</div>
`})
