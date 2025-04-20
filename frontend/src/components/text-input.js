import {YoffeeElement, createYoffeeElement, html} from "../../libs/yoffee/yoffee.min.js";


customElements.define("text-input", class extends YoffeeElement {
    connectedCallback() {
        if (this.props.value) {
            this.setValue(this.props.value);
        }
    }

    propUpdatedCallback(prop) {
        if (prop === "value") {
            this.setValue(this.props.value);
        }
    }

    render() {
        //language=HTML
        return html(this.props, this.state)`
            <style>
                :host {
                    display: flex;
                    border-radius: 5px;
                    font-size: 18px;
                    caret-color: #404040;
                    padding: 10px 20px;
                }
                
                input {
                    width: -webkit-fill-available;
                    width: -moz-available;
                    min-width: 0;
                    border: none;
                    outline: none;
                    background-color: transparent;
                    padding: 0;
                    
                    font-size: inherit;
                    caret-color: inherit;
                    color: inherit;
                    font-family: inherit;
                    text-align: inherit;
                }
                
                ::placeholder { /* Chrome, Firefox, Opera, Safari 10.1+ */
                    color: var(--placeholder-color, #404040);
                    opacity: 0.6; /* Firefox */
                    user-select: none;
                }
                
                /* Chrome, Safari, Edge, Opera */
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                  -webkit-appearance: none;
                  margin: 0;
                }
                
                /* Firefox */
                input[type=number] {
                  -moz-appearance: textfield;
                }
                
                input::selection {
                    background: var(--selection-background, #0000ff10);
                }
            </style>
            <style>
            ${() => this.state.rtl && `
            input {
                direction: rtl;
            }
            `}
            </style>
            <slot name="before"></slot>
            <input type="${() => this.props.type}"
                   step="${() => this.props.step}"
                   pattern="${() => this.props.pattern}"
                   disabled="${() => this.props.disabled}"
                   placeholder="${() => this.props.placeholder}"
                   onchange=${() => this.props.changed && this.props.changed(this.value)}
                   onfocus=${() => this.props.focused && this.props.focused()}
                   onfocusout=${() => this.selected = false}
                   onkeyup=${e => {
                       this.props.keyup && this.props.keyup();
                       this.calcRtl(e)
                   }}
                   onkeydown=${e => {
                       let value = this.value
                       if (value == null) {
                           value = ""
                       }
                       if (e.key === 'Backspace') {
                           value = value.slice(0, -1);
                       } else if (e.key.length === 1) {
                           // ignore special keys like "Control" and "Arrow" etc.
                           value = value + e.key;
                       }
                       
                       if (e.key === 'Enter') {
                           this.props.submitted && this.props.submitted(value)
                       } else {
                           
                       }
                       this.props.keydown && this.props.keydown(value)
                   }}
                   onkeypress=${e => {
                       if (e.key === 'Enter') {
                           this.props.submitted && this.props.submitted(this.value)
                       }
                       this.props.keypress && this.props.keypress(this.value)
                   }}>
            <slot name="after"></slot>
        `
    }

    getValue() {
        return this.shadowRoot.querySelector("input").value
    }

    get value() {
        return this.getValue()
    }

    setValue(value) {
        if (value === true) {
            value = ""
        }
        return this.shadowRoot.querySelector("input").value = value
    }

    focus() {
        return this.shadowRoot.querySelector("input").focus()
    }

    calcRtl(e) {
        let value = this.getValue().trim();
        let match = value.match(/[\u0590-\u05FF]/);
        let rtl = match != null && match.index === 0;
        if (rtl !== this.state.rtl) {
            this.state.rtl = rtl;
        }
    }

    select() {
        this.selected = true
        return this.shadowRoot.querySelector("input").select()
    }
});