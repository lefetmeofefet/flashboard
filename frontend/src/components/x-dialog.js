import {YoffeeElement, createYoffeeElement, html} from "../../libs/yoffee/yoffee.min.js";


createYoffeeElement("x-dialog", class extends YoffeeElement {
    constructor() {
        super({
            open: false,
            isCentered: false,
        })

        // document.addEventListener(
        //     "click",
        //     e => {
        //         if (!this.contains(e.target) && this.state.open) {
        //             this.close()
        //         }
        //     },
        //     {
        //         capture: false
        //     }
        // )
    }

    render() {
        return html(this.state)`
${() => this.state.open && html(this.state)`
<style>
    :host {
        position: fixed;
        top: ${() => this.state.isCentered ? "50%" : `${this.state.position.y}px`};
        left: ${() => this.state.isCentered ? "50%" : `${this.state.position.x}px`};
        display: flex;
        flex-direction: column;
        z-index: 1;
        background-color: #222222;
        border-radius: 4px;
        box-shadow: 1px 1px 5px 0px #000000c2;
        color: #bbbbbb;
    }
</style>
${() => this.state.isCentered && html()`
<style>
    :host {
        transform: translate(-50%, -50%);
    }
</style>
`}
<slot
    onclick=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
    onmousedown=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
    onhover=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
    onmouseover=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
    onmousein=${() => e => {
            e.stopPropagation();
            e.preventDefault()
        }}
></slot>
`}

${() => !this.state.open && html()`
<style>
    :host {
        display: none !important;
    }
</style>
`}
`
    }

    open(anchor, shouldPopIntoScreen, margin, direction="bottom") {
        if (anchor === "center") {
            this.state.position = {x: 0, y: 0}
            this.state.isCentered = true
        } else {
            this.state.position = anchor.x != null ?
                {
                    x: anchor.x,
                    y: anchor.y
                } : {
                    x: anchor.offsetLeft,
                    y: direction === "bottom" ? (anchor.offsetTop + anchor.offsetHeight + 5) : (anchor.offsetTop - margin || 0)
                };
            this.state.isCentered = false
        }

        this.state.open = true;
        if (shouldPopIntoScreen) {
            let {width, height} = this.getBoundingClientRect();
            margin = margin || 20;
            let screenWidth = Math.min(window.screen.width, window.innerWidth);
            let screenHeight = Math.min(window.screen.height, window.innerHeight);
            if (this.state.position.x + width + margin > screenWidth) {
                this.state.position.x = screenWidth - width - margin;
            }
            if (this.state.position.x < margin) {
                this.state.position.x = margin;
            }

            if (this.state.position.y + height + margin > screenHeight) {
                this.state.position.y = screenHeight - height - margin;
            }
            if (this.state.position.y < margin) {
                this.state.position.y = margin;
            }

            // IMPROTANT
            this.state.position = this.state.position;
        }
    }

    close() {
        this.state.open = false
        this.dispatchEvent(new Event('close'))
    }

    isOpen() {
        return this.state.open
    }

    toggle(...args) {
        if (this.isOpen()) {
            this.close()
        } else {
            this.open(...args)
        }
    }
});