import {YoffeeElement, createYoffeeElement, html} from "../../libs/yoffee/yoffee.min.js";
import "./x-button.js"


createYoffeeElement("x-double-slider", class extends YoffeeElement {
    constructor() {
        super({
            isSliding: false
        });

        window.addEventListener('pointerup', (event) => {
            if (this.isSliding) {
                this.props.released && this.props.released(this.getValue())
                // event.preventDefault();
                // requestAnimationFrame(() => this.updateCircleLocation(event))
                this.isSliding = false;
            }
        })

        window.addEventListener('pointermove', (event) => {
            if (this.isSliding) {
                event.preventDefault();
                requestAnimationFrame(() => this.updateCircleLocation(event))
            }
        })

        if (this.props.initvaluemin != null || this.props.initvaluemax != null) {
            const resizeObserver = new ResizeObserver((entries) => {
                let initMin = parseFloat(this.props.initvaluemin)
                let initMax = parseFloat(this.props.initvaluemax)
                let range = this.limitMax() - this.limitMin()
                let min = (initMin - this.limitMin()) / range
                let max = (initMax - this.limitMin()) / range
                if (this.isInitialized()) {
                    let currentValue = this.getNormalizedValue()
                    min = currentValue.min
                    max = currentValue.max
                }
                this.updateCircleLocationByInitialValue(min, max)
                // resizeObserver.disconnect()
            });
            resizeObserver.observe(this);
        }

        this.addEventListener("pointerdown", e => {
            console.log("I been clicked")
            let circles = this.circles
            let closerCircle
            if (Math.abs(circles[0].offsetLeft + 12.5 - e.offsetX) < Math.abs(circles[1].offsetLeft + 12.5 - e.offsetX)) {
                closerCircle = circles[0]
            } else {
                closerCircle = circles[1]
            }
            this.currentCircle = closerCircle
            this.isSliding = true
            // this.startX = this.currentCircle.offsetLeft - 12.5
            this.startX = 0

            // this.updateCircleLocation(e)
            // this.currentCircle.dispatchEvent(new PointerEvent("pointerdown"));
            // this.currentCircle.offsetLeft = e.offsetX - 12.5
            // this.currentCircle.click()
            e.stopPropagation()
            e.preventDefault()
        })
    }

    limitMin() {
        return parseFloat(this.props.min) || 0
    }

    limitMax() {
        return parseFloat(this.props.max) || 1
    }

    updateCircleLocation(event) {
        if (this.currentCircle == null) {
            return
        }

        let container = this.getBoundingClientRect()

        let newX = event.pageX - this.startX - container.x
        if (newX < 0) {
            newX = 0
        } else if (newX > container.width) {
            newX = container.width
        }

        if (this.props.step != null) {
            let range = this.limitMax() - this.limitMin()
            let newXInRange = (newX / container.width) * range
            newXInRange = Math.round(newXInRange)
            newX = (newXInRange / range) * container.width
        }

        this.currentCircle.style.left = newX + "px"
        this.currentCircle._sliderPosition = newX / container.width

        let {min, max} = this.getNormalizedValue()

        if (this.props.step != null) {
            let range = this.limitMax() - this.limitMin()
            min = Math.round(min * range) / range
            max = Math.round(max * range) / range
        }
        this.line.style.left = Math.floor(min * container.width) + "px"
        this.line.style.width = Math.floor((max - min) * container.width) + "px"

        this.props.updated && this.props.updated(this.getValue())
    }

    updateCircleLocationByInitialValue(initialValueMin, initialValueMax) {
        let container = this.getBoundingClientRect()
        let minX = container.width * initialValueMin
        let maxX = container.width * initialValueMax

        let circles = [...this.shadowRoot.querySelectorAll(".circle")]
        circles[0].style.left = minX + "px"
        circles[0]._sliderPosition = initialValueMin
        circles[1].style.left = maxX + "px"
        circles[1]._sliderPosition = initialValueMax
        this.line.style.left = minX + "px"
        this.line.style.width = (maxX - minX) + "px"
    }

    connectedCallback() {
        this.circles = [...this.shadowRoot.querySelectorAll(".circle")]
        this.line = this.shadowRoot.querySelector("#mid-line")
    }

    isInitialized() {
        let circle = this.shadowRoot.querySelector(".circle")
        if (circle != null) {
            return circle._sliderPosition != null
        }
    }

    getNormalizedValue() {
        let values = [...this.circles.map(c => c._sliderPosition)]
        return {min: Math.min(...values), max: Math.max(...values)}
    }

    getValue() {
        let {min, max} = this.getNormalizedValue()
        let range = this.limitMax() - this.limitMin()
        return {
            min: this.limitMin() + range * min,
            max: this.limitMin() + range * max
        }
    }

    render() {
        //language=HTML
        return html(this.props, this.state)`
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
                    /*top: var(--circle-margin);*/
                    /*left: var(--circle-margin);*/
                    width: var(--circle-size);
                    height: var(--circle-size);
                    margin-left: calc(var(--circle-size) * -0.5);
                    transition: 0s;
                }

                #line, #mid-line {
                    width: 100%;
                    height: var(--line-height);
                    background: var(--line-color);
                    left: var(--circle-size);
                }

                #mid-line {
                    position: absolute;
                    background-color: var(--circle-color);
                }

            </style>

            <div id="mid-line"></div>
            <x-button class="circle"
                      onpointerdown=${e => {
                          this.currentCircle = e.target
                          this.isSliding = true
                          this.startX = e.offsetX - 12.5
                          e.stopPropagation()
                          e.preventDefault()
                      }}
                      onpointerup=${() => {
                          this.currentCircle = null
                      }}
            ></x-button>
            <x-button class="circle"
                      onpointerdown=${e => {
                          this.currentCircle = e.target
                          this.isSliding = true
                          this.startX = e.offsetX - 12.5
                          e.stopPropagation()
                          e.preventDefault()
                      }}
                      onpointerup=${() => {
                          this.currentCircle = null
                      }}
            ></x-button>
            <div id="line" 
                 onclick=${e => {
                     return
                     console.log("I been clicked")
                     let circles = this.circles
                     let closerCircle
                     if (Math.abs(circles[0].offsetX - e.offsetX) < Math.abs(circles[1].offsetX - e.offsetX)) {
                         closerCircle = circles[0]
                     } else {
                         closerCircle = circles[1]
                     }
                     this.currentCircle = closerCircle
                     this.isSliding = true
                     this.startX = e.offsetX - 12.5
                     e.stopPropagation()
                     e.preventDefault()
                 }}
            ></div>
            
        `
    }
});