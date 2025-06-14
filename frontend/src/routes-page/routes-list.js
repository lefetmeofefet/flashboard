import {html, createYoffeeElement} from "../../libs/yoffee/yoffee.min.js"
import {
    GlobalState,
    enterRoutePage,
    toggleLikeRoute, setFilteredRoutes, getFilteredRoutes
} from "../state.js";
import "../components/text-input.js"
import "../components/x-loader.js"
import "../components/x-button.js"
import "../components/x-icon.js"
import "../components/x-tag.js"
import "../components/x-dialog.js"
import "../components/x-switch.js"
import {FILTER_TYPES, SORT_TYPES} from "./routes-filter.js";

const MAX_ROUTES_OUT_OF_SCREEN = 20

let routesToShow = MAX_ROUTES_OUT_OF_SCREEN
createYoffeeElement("routes-list", (props, self) => {
    let state = {
        numRoutesToShow: routesToShow
    }

    self.addEventListener("scroll", () => {
        let scroll = self.scrollHeight - self.scrollTop - self.clientHeight
        if (scroll <= 300 && state.numRoutesToShow < getFilteredRoutes().length) {
            state.numRoutesToShow += MAX_ROUTES_OUT_OF_SCREEN
            routesToShow += MAX_ROUTES_OUT_OF_SCREEN
        }
    })

    self.addEventListener("pointerdown", () => {
        // When starting scrolling, close open dropdowns, e.g. grade filter
        self.focus()
    })

    return html(GlobalState, state)`
<style>
    :host {
        display: flex;
        flex-direction: column;
        overflow-y: scroll;
        padding-bottom: 100px;
        /*Making the scrollbar far to the right:*/
        margin-right: -10%; /* Negative margin equal to container's padding */
        padding-right: calc(10% - 7px); /* Prevents content from being under the scrollbar */
        outline: none;
    }
    
    @media (max-width: 900px) {
        :host {
            margin-right: -7%; /* Negative margin equal to container's padding */
            padding-right: 7%; /* Prevents content from being under the scrollbar */
        }
    }
    
    #no-routes {
        color: var(--text-color-weak-1);
        margin-top: 10px;
    }
    
    .route {
        display: flex;
        align-items: center;
        padding: 0 5px;
        border-radius: 0;
        color: unset;
        box-shadow: none;
        height: 30px; /* Important for scroll not moving when reloading*/
        --overlay-color: rgb(var(--text-color-rgb), 0.1);
        --ripple-color: rgb(var(--text-color-rgb), 0.3);
        gap: 5px;
        min-height: 63px;
    }
    
    .route + .route {
        border-top: 1px solid var(--text-color-weak-3);
    }
    
    .route > .left-side {
        display: flex;
        flex-direction: column;
    }
    
    .route > .left-side > .name {
        
    }
    
    .route > .left-side > .bottom-info {
        display: flex;
        gap: 3px;
        align-items: center;
        font-size: 14px;
        white-space: nowrap;
        color: var(--text-color-weak-1);
    }
    
    .route > .left-side > .bottom-info > .dot {
        background-color: var(--text-color);
        opacity: 0.6;
        border-radius: 100px;
        width: 4px;
        min-width: 4px;
        height: 4px;
        margin: 0 2px;
    }
    
    .route > .left-side > .bottom-info > .setter {
        
    }
    
    .route > .left-side > .bottom-info > .sent-icon {
        color: var(--great-success-color);
        margin-left: 2px;
    }
    
    .route > .left-side > .bottom-info > .heart-icon {
        margin-left: 2px;
        opacity: 0.8;
        color: var(--love-color);
        font-size: 12px;
    }
    
    x-rating {
        margin-left: auto;
        --star-size: 12px;
        --star-padding: 0px;
        flex-wrap: wrap;
    }
    
    .route > .grade {
        min-width: 21px;
    }
</style>

${() => {
    let filteredRoutes = filterRoutes()
    if (filteredRoutes.length === 0) {
        if (GlobalState.holds.length === 0) {
            return null
        }
        return html()`<div id="no-routes">No routes</div>`
    }
    setFilteredRoutes(filteredRoutes)
    return filteredRoutes.filter((_, index) => index < state.numRoutesToShow)
            .map(route => html(route)`
<x-button class="route" 
          onclick=${() => !GlobalState.loading && enterRoutePage(route)}
          no-ripple>
    <div class="left-side">
        <div class="name">${() => route.name}</div>
        <div class="bottom-info">
            <div class="setter">${() => route.setters[0]?.nickname || "User deleted"},</div>
            <!--<div class="dot"></div>-->
            ${() => route.sends === 1 ? "1 send" : route.sends + " sends"}
            ${() => route.sent && html()`<x-icon class="sent-icon" icon="fa fa-check"></x-icon>`}
            ${() => route.liked && html()`<x-icon class="heart-icon" icon="fa fa-heart"></x-icon>`}
        </div>
    </div>
    
    <x-rating rating=${() => route.starsAvg}
              raters=${() => route.numRatings}
              onlyactive></x-rating>
    
    <div class="grade">V${() => route.grade}</div>
</x-button>`)
}}
`
})

function filterRoutes() {
    return GlobalState.routes.filter(route => {
        for (let filter of GlobalState.filters) {
            if (filter.type === FILTER_TYPES.GRADE) {
                if (route.grade < filter.value.min || route.grade > filter.value.max) {
                    return false
                }
            } else if (filter.type === FILTER_TYPES.RATING) {
                if (route.starsAvg < filter.value) {
                    return false
                }
            } else if (filter.type === FILTER_TYPES.SETTER) {
                if (route.setters[0]?.id !== filter.value.id) {
                    return false
                }
            } else if (filter.type === FILTER_TYPES.LIKED_ROUTES) {
                if (!route.liked) {
                    return false
                }
            } else if (filter.type === FILTER_TYPES.SENT_BY_ME) {
                if (!route.sent) {
                    return false
                }
            } else if (filter.type === FILTER_TYPES.NOT_SENT_BY_ME) {
                if (route.sent) {
                    return false
                }
            } else if (filter.type === FILTER_TYPES.IN_LIST) {
                if (!(route.lists || []).includes(filter.value)) {
                    return false
                }
            }
        }
        if (GlobalState.freeTextFilter != null) {
            if (route.name.toLowerCase().includes(GlobalState.freeTextFilter.toLowerCase())) {
                return true
            }
            if (route.setters[0]?.nickname.toLowerCase().includes(GlobalState.freeTextFilter.toLowerCase())) {
                return true
            }
            return false
        }
        return true
    })
}
