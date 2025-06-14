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

let defaultImageWidth, defaultImageHeight

createYoffeeElement("wall-element", (props, self) => {
    let state = {
        imageMode: localStorage.getItem("wall-image-mode") || IMAGE_MODES.CONTAIN,
        showHolds: false,
    }

    // Dragging
    let clickedHold
    let dragging = false
    let panning = false
    let dragStartPosition
    let holdsElement
    let longPressTimer
    let isAfterLongPress = false
    const MIN_DISTANCE_FOR_DRAG = 8
    const LONG_PRESS_TIME = 500

    let containerElement
    let imageElement
    self.onConnect = () => {
        containerElement = self.shadowRoot.querySelector("#container")
        imageElement = self.shadowRoot.querySelector("#image")

        // First load we calculate the width and height of the image to be used forevermore
        imageElement.onload = () => {
            let xRatio = self.offsetWidth / imageElement.naturalWidth
            let yRatio = self.offsetHeight / imageElement.naturalHeight
            let ratio = Math.min(xRatio, yRatio)
            let newWidth = imageElement.naturalWidth * ratio
            let newHeight = imageElement.naturalHeight * ratio
            if (imageElement.width !== newWidth) {
                imageElement.width = newWidth
            }
            if (imageElement.height !== newHeight) {
                imageElement.height = newHeight
            }

            if (state.imageMode !== IMAGE_MODES.CONTAIN) {
                setImageMode(state.imageMode)
            }

            state.showHolds = true
            defaultImageWidth = imageElement.width
            defaultImageHeight = imageElement.height
        }
        // imageElement.src = WallImage

        const zoomControlButton = self.shadowRoot.querySelector("x-button#zoom-control-button")
        let hideTimeout

        self.showZoomControlButton = () => {
            // Make zoom control button disappear and appear when panning / zooming
            zoomControlButton.classList.add("show");
            clearTimeout(hideTimeout)
            hideTimeout = setTimeout(() => {
                zoomControlButton.classList.remove("show")
            }, 3000)
        }

        let lastNumFingers = 0
        zoomify(
            containerElement,
            {
                parent: self,
                onZoom: () => {
                    if (state.imageMode === IMAGE_MODES.COVER) {
                        state.imageMode = IMAGE_MODES.CONTAIN
                    }
                },
                onInteraction: () => {
                    self.showZoomControlButton()
                },
                numFingersChanged: numFingers => {
                    panning = numFingers > 1 || (numFingers === 1 && lastNumFingers > 1)
                    lastNumFingers = numFingers
                    if (panning) {
                        clearTimeout(longPressTimer)
                    }
                },
                onBorderSwipe: borderSwipe => {
                    self.dispatchEvent(new CustomEvent('borderswipe', {
                        detail: {
                            x: borderSwipe.x,
                            y: borderSwipe.y,
                        }
                    }))
                },
                onBorderSwipeEnd: borderSwipe => {
                    console.log("Borderswipe end")
                    self.dispatchEvent(new CustomEvent('borderswipeend'))
                }
            }
        )
        if (state.imageMode !== IMAGE_MODES.CONTAIN) {
            setImageMode(state.imageMode)
        }
    }

    self.shadowRoot.addEventListener('pointerup', async () => {
        clearTimeout(longPressTimer)

        if (clickedHold != null) {
            if (dragging) {
                if (props.draggingholds) {
                    self.dispatchEvent(new CustomEvent('dragholdfinish', {
                        detail: {
                            hold: clickedHold
                        }
                    }))
                }
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

    self.convertPointToWallPosition = (pageX, pageY) => {
        if (holdsElement == null) {
            holdsElement = self.shadowRoot.querySelector("#holds")
        }
        let {x, y, width, height} = holdsElement.getBoundingClientRect()
        return {
            x: bound((pageX - x) / width),
            y: bound((height - pageY + y) / height)
        }
    }

    self.shadowRoot.addEventListener('pointermove', (event) => {
        if (panning) {
            return
        }
        if (clickedHold != null) {
            if (!dragging && isDistanceEnoughForDragging(event.pageX, event.pageY)) {
                // We wait to make the click be dismissed because of dragging=true
                dragging = true
                clearTimeout(longPressTimer)
            }
            if (dragging) {
                event.preventDefault();
                let {x, y} = self.convertPointToWallPosition(event.pageX, event.pageY)
                if (props.draggingholds) {
                    self.dispatchEvent(new CustomEvent('draghold', {
                        detail: {
                            hold: clickedHold,
                            x,
                            y
                        }
                    }))
                }
            }
        }
    })

    const holdClicked = async hold => {
        if (panning) {
            return
        }
        console.log("normal click")
        if (isAfterLongPress) {
            // When releasing after long press we don't want a normal click to be registered
            isAfterLongPress = false
            return
        }

        self.dispatchEvent(new CustomEvent('clickhold', {detail: {hold}}))
    }

    const holdLongPressed = async hold => {
        if (panning) {
            return
        }
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
            containerElement.stretchToParent()
        }
    }

    const filterTouchEvent = e => {
        if (props.draggingholds) {
            e.stopPropagation()
            e.preventDefault()
        }
    }

    return html(props, state)`
<style>
    :host {
        display: flex;
        height: inherit;
        /*position: relative; !* fuck up the offsetTop of elements *! */
        flex: 1;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        /*overflow: auto;  !* for some reason, important for not jittering the display wtf *! */
        overflow: hidden;
        /*translate: 0; !* makes the FAB not jump when scolling using transform translate *!*/
        transform: translateZ(0);
        position: relative;
    }
    
    #container {
        display: flex;
        position: relative;
        overflow: hidden; /* for iphone shit */
        width: fit-content;
        height: fit-content;
        will-change: transform; /* important for panning performance! */ 
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
        background-color: #00000040;
        border-radius: 100px;
        color: var(--text-color-on-secondary);
        border: 3px solid transparent;
        border: 1px solid #ffffff50;
    }
    
    @supports not (-webkit-touch-callout: none) {
        /* CSS specific to NOT iOS devices */
        #holds > .hold {
            transform: translate3d(-50%, 50%, 0);
        }
    }
    @supports (-webkit-touch-callout: none) {
        /* CSS specific to iOS devices. STRANGE BUG */
        #holds > .hold {
            transform: translate3d(-50%, 0, 0);
        }
    }
    
    #holds > .hold:is(:not([data-hold-type=none])) {
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
        bottom: 10px;
        right: 30px;
        
        opacity: 0;
        visibility: hidden;
        transition: opacity 1s ease-out, visibility 0s linear 1s;
    }
      
    x-button#zoom-control-button.show {
        opacity: 1;
        visibility: visible;
        transition: opacity 0.2s ease-in, visibility 0s;
    }
</style>

<div id="container">
    <img id="image" src="${WallImage}" width="${defaultImageWidth}" height="${defaultImageHeight}"/>
    ${() => state.showHolds && !props.hideholds ? html()`
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
             data-hold-type=${() => hold.inRoute ? (hold.holdType === "" ? "hold" : hold.holdType) : "none"}
             style="${() => `
                left: ${hold.x * 100}%;
                /*bottom: {self.offsetHeight * hold.y}px;  this is because some browsers fuck percentages because of search bars etc. */
                /* iphone doesnt care about the 2% margin in the height calculation, cause apple are idiots. so we compensate here */
                bottom: ${hold.y * 100 * (window.isIOS ? 0.96 : 1)}%;
                width: ${(hold.diameter || GlobalState.defaultHoldDiameter) * (imageElement?.width / 100) * (hold.inRoute ? 1.2 : 1)}px;
                height: ${(hold.diameter || GlobalState.defaultHoldDiameter) * (imageElement?.width / 100) * (hold.inRoute ? 1.2 : 1)}px;
             `}"
             onpointerdown=${e => {
                if (panning) {
                    return
                }
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
    ` : ""}
</div>
<x-button id="zoom-control-button"
          onclick=${e => {
                e.stopPropagation()
                if (state.imageMode === IMAGE_MODES.CONTAIN) {
                    setImageMode(IMAGE_MODES.COVER)
                } else if (state.imageMode === IMAGE_MODES.COVER) {
                    setImageMode(IMAGE_MODES.STRETCH)
                } else if (state.imageMode === IMAGE_MODES.STRETCH) {
                    containerElement.unStretchToParent()
                    setImageMode(IMAGE_MODES.CONTAIN)
                }
                self.showZoomControlButton()
    }}>
    <x-icon icon=${() => state.imageMode === IMAGE_MODES.CONTAIN ? "fa fa-expand" : 
        (state.imageMode === IMAGE_MODES.COVER ? "fa fa-arrows-alt" : "fa fa-compress")}></x-icon>
</x-button>

`})
