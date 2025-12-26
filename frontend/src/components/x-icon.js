import {YoffeeElement, html} from "../../libs/yoffee/yoffee.min.js";

/**
 * Include this in index.html:

 @font-face {
   font-family: 'Material Symbols Rounded';
   font-style: normal;
   font-weight: 400;
   font-display: block;
   src: url(https://fonts.gstatic.com/s/materialsymbolsrounded/v267/syl0-zNym6YjUruM-QrEh7-nyTnjDwKNJ_190FjpZIvDmUSVOK7BDJ_vb9vUSzq3wzLK-P0J-V_Zs-QtQth3-jOcbTCVpeRL2w5rwZu2rIelXxc.woff2) format('woff2');
   /* Taken from: <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,1,0&display=block" />
   /* No internet icons:
   /* src: url("./res/icons/google_material_icons_rounded.woff2") format('woff2');
 }

 */


customElements.define("x-icon", class extends YoffeeElement {
    render() {
        //language=HTML
        return html(this.props)`
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .material-symbols-rounded {
                    font-family: 'Material Symbols Rounded';
                    font-weight: normal;
                    font-style: normal;
                    /*font-size: 24px;*/
                    font-size: 1.5em;  /* Based on inherited font size */
                    width: 0.85em;
                    height: 0.85em;
                    line-height: 1;
                    letter-spacing: normal;
                    vertical-align: middle;
                    text-transform: none;
                    /*display: inline-block;*/
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    white-space: nowrap;
                    word-wrap: normal;
                    direction: ltr;
                    -webkit-font-feature-settings: 'liga';
                    -webkit-font-smoothing: antialiased;
                }
            </style>
            
            <span class="material-symbols-rounded"
                  style=${() => this.props.spin ? "animation: spin 1s linear infinite;" : ""}
            >${() => this.props.icon}</span>
        `
    }
});