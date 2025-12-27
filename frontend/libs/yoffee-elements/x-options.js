import {YoffeeElement, createYoffeeElement, html} from "../yoffee/yoffee.min.js";
import "./x-button.js"


customElements.define("x-options", class extends YoffeeElement {
    render() {
        //language=HTML
        return html(this.props, this.state)`
                <style>
                    :host {
                        display: flex;
                        align-items: center;
                    }
                    
                    #container {
                        display: flex;
                    }
                    
                    x-button {
                        display: flex;
                        font-size: inherit;
                        background-color: #00000000;
                        box-shadow: none;
                        border-radius: 0;
                        color: black;
                        border: 1px solid #00000025;
                        padding: 4px 8px;
                    }
                    
                    x-button:first-of-type {
                        border-bottom-left-radius: 2px;
                        border-top-left-radius: 2px;
                    }
                    
                    x-button:last-of-type {
                        border-bottom-right-radius: 2px;
                        border-top-right-radius: 2px;
                    }
                    
                    x-button[is-selected] {
                        background-color: #533e1e;
                        border: 1px solid #533e1e;
                        color: white;
                        opacity: 1;
                    }
                    
                </style>
                
                <div id="container">
                    ${() => this.props.options.map(option => html()`
                        <x-button clicked=${() => () => this.clicked(option)}
                                  is-selected=${() => option === this.props.value}
                                  disabled=${() => option === this.props.value}
                                  >
                            ${option}
                        </x-button>
                    `)}
                </div>
        `
    }

    clicked(option) {
        if (option !== this.props.value) {
            this.props.selected && this.props.selected(option);
        }
    }
});