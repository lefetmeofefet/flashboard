import {YoffeeElement, createYoffeeElement, html} from "../../libs/yoffee/yoffee.min.js";
import "./x-button.js"
import "./x-icon.js"


customElements.define("x-checkbox", class extends YoffeeElement {
    constructor() {
        super({});

        if (window.IOS) {
            // this.onmouseup = () => this.dispatchEvent(new Event('click'));
            this.onmouseup = e => this.props.selected && this.props.selected(e);
        } else {
            this.onclick = e => this.props.selected && this.props.selected(e);
        }
    }

    render() {
        //language=HTML
        return html(this.props, this.state)`
                <style>
                    :host {
                        display: flex;
                        align-items: center;
                        border-radius: 3px;
                    }
                    
                    x-button {
                        background-color: #00000000;
                        box-shadow: none;
                        padding: 3px;
                        border: 2px solid #99999920;
                        border-radius: inherit;
                    }
                    
                    x-button[is-on] {
                        border-color: var(--on-color, rgb(83, 62, 30));
                        background-color: var(--on-color, rgb(83, 62, 30));
                    }
                    
                    #check {
                        display: flex;
                        visibility: hidden;
                        color: white;  
                    }
                    
                    x-button[is-on]>#check {
                        visibility: visible;
                    }
                    
                </style>
                <x-button is-on="${() => this.props.value}">
                    <x-icon id="check" icon="check"></x-icon>
                </x-button>
        `
    }
});