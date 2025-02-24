import {YoffeeElement, createYoffeeElement, html} from "../../libs/yoffee/yoffee.min.js";


customElements.define("x-rating", class extends YoffeeElement {
    render() {
        //language=HTML
        return html(this.props, this.state)`
            <style>
                :host {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                #rating {
                    padding: var(--star-padding, 2px);
                    font-size: var(--font-size, 14px);
                }
                
                x-icon {
                    font-size: var(--star-size, 16px);
                    cursor: pointer;
                    padding: var(--star-padding, 2px);
                    color: grey;
                }

                x-icon[golden] {
                    color: #BFA100;
                }
            </style>
            
            ${() => this.props.onestar ? html()`
            <div id="rating">${() => parseFloat(this.props.rating).toPrecision(2)}</div>
            <x-icon icon="fa fa-star" 
                    golden></x-icon>
            ` : [1, 2, 3, 4, 5]
                    .filter(starNum => !this.props.onlyactive || starNum <= parseFloat(this.props.rating) + 0.5)
                    .map(starNum => html()`
            <x-icon icon="fa fa-star"
                    golden=${() => (parseFloat(this.props.rating) + 0.5) >= starNum || this.state.selectedRating >= starNum || this.state.hoveredRating >= starNum}
                    onclick=${() => {
                        if (this.props.picked != null) {
                            this.state.selectedRating = starNum
                            this.props.picked(starNum)
                        }
                    }}
                    onmouseover=${() => this.props.picked && (this.state.hoveredRating = starNum)}
                    onmouseout=${() => this.props.picked && (this.state.hoveredRating = null)}>        
            </x-icon>
            `)
            }
        `
    }
});