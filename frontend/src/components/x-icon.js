import {YoffeeElement, createYoffeeElement, html} from "../../libs/yoffee/yoffee.min.js";


customElements.define("x-icon", class extends YoffeeElement {
    render() {
        //language=HTML
        return html(this.props)`
            <link rel="stylesheet" href="https://kit-free.fontawesome.com/releases/latest/css/free.min.css" media="all">
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
            </style>
            
            <i class="${() => this.props.icon}"></i>
<!--            X-->
        `
    }
});