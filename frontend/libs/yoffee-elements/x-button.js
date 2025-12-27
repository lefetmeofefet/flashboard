import {YoffeeElement, createYoffeeElement, html} from "../yoffee/yoffee.min.js";


customElements.define("x-button", class extends YoffeeElement {
    constructor() {
        super({

        });

        this.onmousedown = e => {
            if (this.hasAttribute("disabled") || this.hasAttribute("no-ripple")) {
                return;
            }
            let rect = e.target.getBoundingClientRect();
            let x = e.clientX - rect.left; //x position within the element.
            let y = e.clientY - rect.top;

            let rippleDiv = document.createElement("div");
            rippleDiv.classList.add('ripple');
            rippleDiv.setAttribute("style",`top:${y}px; left:${x}px; pointer-events: none;`);
            this.shadowRoot.appendChild(rippleDiv);
            setTimeout(() => {
                this.shadowRoot && this.shadowRoot.removeChild(rippleDiv);
            }, 900);
        };

        if (window.IOS) {
            // this.onmouseup = () => this.dispatchEvent(new Event('click'));
            this.onmouseup = e => this.props.clicked && this.props.clicked(e);
        } else {
            this.onclick = e => this.props.clicked && this.props.clicked(e);
        }
    }

    render() {
        //language=HTML
        return html(this.props, this.state)`
            <style>
                :host {
                    -webkit-tap-highlight-color: rgba(0,0,0,0);
                    -webkit-tap-highlight-color: transparent;
                    
                    position:relative;
                    display: flex;
                    overflow:hidden;
                    
                    align-items: center;
                    justify-content: center;
                    /*background-color: rgb(83, 62, 30);*/
                    color: #eeeeee;
                    
                    outline: none;
                    border-radius: 3px;
                    padding: 8px 16px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
                    /*transition: 0.2s;*/
                    cursor: pointer;
                    user-select: none;
                    border: none;
                }
                
                #overlay {
                    opacity: 0;
                    top: 0;
                    left: 0;
                    background-color: var(--overlay-color, white);
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border-radius: inherit;
                    pointer-events: none;
                    outline:none;
                }
                
                :host(:not([disabled]):hover)>#overlay {
                    opacity: 0.15;
                }
                
                :host([disabled]) {
                    box-shadow: 1px 1px 2px 0px #00000025;
                    opacity: 0.2;
                    cursor: default;
                }
                
                .ripple{
                    position: absolute;
                    background: var(--ripple-color, #fff);
                    border-radius: 50%;
                    width: 5px;
                    height: 5px;
                    animation: rippleEffect .88s 1;
                    opacity: 0;
                }
                
                @keyframes rippleEffect {
                    0% {transform:scale(1); opacity:0.4;}
                    100% {transform:scale(100); opacity:0;}
                }
            </style>
            <div id="overlay"></div>
            <slot>
        `
    }
});