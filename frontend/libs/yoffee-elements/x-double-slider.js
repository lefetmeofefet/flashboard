import {YoffeeElement, createYoffeeElement, html} from "../yoffee/yoffee.min.js";
import "./x-button.js"


createYoffeeElement("x-double-slider", (props, self) => {
    let circles = []
    let draggedCircle = null
    let minLine = null
    let sliderWidthPx = 0

    self.onConnect = () => {
        circles = [...self.shadowRoot.querySelectorAll(".circle")]
        minLine = self.shadowRoot.querySelector("#mid-line")

        const resizeObserver = new ResizeObserver(() => {
            sliderWidthPx = self.getBoundingClientRect().width
            // console.log("opening slider init value ", props.initvaluemin, props.initvaluemax)
            let range = limitMax() - limitMin()
            let minValueNormalized = circles[0]._normalizedPosition || ((parseFloat(props.initvaluemin) || limitMin() - limitMin()) / range)
            let maxValueNormalized = circles[1]._normalizedPosition || ((parseFloat(props.initvaluemax) || limitMax() - limitMax()) / range)
            updateCircleLocation(circles[0], minValueNormalized)
            updateCircleLocation(circles[1], maxValueNormalized)
            updateMidLine()
        });
        resizeObserver.observe(self);
    }

    let limitMin = () => parseFloat(props.min) || 0
    let limitMax = () => parseFloat(props.max) || 1

    let onDrag = e => {
        handlePositionEvent(e)
    }

    let handlePositionEvent = e => {
        let normalizedPosition = e.offsetX / sliderWidthPx
        updateCircleLocation(draggedCircle, normalizedPosition)
        updateMidLine()
        props.updated && props.updated(self.getValue())
    }

    let getNormalizedValue = () => {
        let values = [...circles.map(c => c._normalizedPosition)]
        return {min: Math.min(...values), max: Math.max(...values)}
    }

    let attachListener = () => self.addEventListener("pointermove", onDrag)
    let detachListener = () => {
        self.removeEventListener("pointermove", onDrag)
        props.released && props.released()
    }

    let circlePressed = e => {
        e.stopPropagation()
        e.preventDefault()
        draggedCircle = e.target
        attachListener()
    }

    let circleReleased = e => {
        detachListener()
    }

    // when line pressed / released
    self.addEventListener("pointerdown", e => {
        let normalizedPosition = e.offsetX / sliderWidthPx
        if (Math.abs(circles[0]._normalizedPosition - normalizedPosition) < Math.abs(circles[1]._normalizedPosition - normalizedPosition)) {
            draggedCircle = circles[0]
        } else {
            draggedCircle = circles[1]
        }
        e.stopPropagation()
        e.preventDefault()
        attachListener()
        handlePositionEvent(e)
    })

    self.addEventListener("pointerup", e => {
        detachListener()
    })

    let updateCircleLocation = (circle, normalizedValue) => {
        // console.log("Updating circle. normalized value: ", normalizedValue)
        if (normalizedValue < 0) {
            normalizedValue = 0
        } else if (normalizedValue > 1) {
            normalizedValue = 1
        }
        if (props.step != null) {
            let range = limitMax() - limitMin()
            let newXInRange = normalizedValue * range
            newXInRange = Math.round(newXInRange)
            normalizedValue = (newXInRange / range)
        }
        let positionPx = sliderWidthPx * normalizedValue

        circle.style.left = positionPx + "px"
        circle._normalizedPosition = normalizedValue
    }

    let updateMidLine = () => {
        let {min, max} = getNormalizedValue()
        minLine.style.left = min * sliderWidthPx + "px"
        minLine.style.width = (max - min) * sliderWidthPx + "px"
    }

    self.getValue = () => {
        let {min, max} = getNormalizedValue()
        let range = limitMax() - limitMin()
        return {
            min: limitMin() + range * min,
            max: limitMin() + range * max
        }
    }

    return html(props)`
    <style>
    :host {
        position: relative;
        display: flex;
        align-items: center;
        --circle-size: 25px;
        --line-height: 2px;
        --line-color: #999999;
        --circle-color: #88aadd;
        height: calc(var(--circle-size) + 6px);
        width: -webkit-fill-available;
        touch-action: none;
    }

    .circle {
        position: absolute;
        background-color: var(--circle-color);
        border-radius: 100px;
        padding: 0;
        width: var(--circle-size);
        height: var(--circle-size);
        margin-left: calc(var(--circle-size) * -0.5);
        transition: 0s;
    }

    #line {
        left: var(--circle-size);
    }
    
    #line, #mid-line {
        width: 100%;
        height: var(--line-height);
        background: var(--line-color);
    }

    #mid-line {
        position: absolute;
        background-color: var(--circle-color);
    }
    </style>
    <div id="line"></div>
    <div id="mid-line"></div>
    <x-button class="circle"
              onpointerdown=${e => circlePressed(e)}
              onpointerup=${e => circleReleased(e)}></x-button>
    <x-button class="circle"
              onpointerdown=${e => circlePressed(e)}
              onpointerup=${e => circleReleased(e)}></x-button>
    `
})
