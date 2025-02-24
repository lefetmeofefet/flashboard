import {html, createYoffeeElement} from "../../libs/yoffee/yoffee.min.js"
import {
    GlobalState, sortRoutes,
} from "../state.js";
import "../components/text-input.js"
import "../components/x-loader.js"
import "../components/x-button.js"
import "../components/x-icon.js"
import "../components/x-tag.js"
import "../components/x-dialog.js"
import "../components/x-switch.js"
import "../components/x-double-slider.js"

function filterTypeToHtml(filterType) {
    return filterType.toLowerCase().replaceAll(" ", "-")
}

const SORT_TYPES = {
    NEWEST: "Newest",
    RATING: "Rating",
    MOST_SENDS: "Most sends",
    LEAST_SENDS: "Least sends",
    OLDEST: "Oldest",
    HARDEST: "Hardest",
    EASIEST: "Easiest",
}

const FILTER_TYPES = {
    GRADE: "Grade",
    LIKED_ROUTES: "Liked routes",
    SENT_BY_ME: "Sent by me",
    NOT_SENT_BY_ME: "Not sent by me",
    SETTER: "Setter",
    RATING: "Rating",
    IN_LIST: "In list",
}


createYoffeeElement("routes-filter", (props, self) => {
    let state = {
        editedFilterType: null
    }

    function setFilter(filterType, value) {
        let existingFilter = GlobalState.filters.find(filter => filter.type === filterType)
        if (existingFilter != null) {
            existingFilter.value = value
        } else {
            GlobalState.filters.push({type: filterType, value})
            GlobalState.filters = [...GlobalState.filters]
        }
    }

    function createFilter(filterType) {
        self.shadowRoot.querySelector("#add-filter-dialog").close()

        if (filterType === FILTER_TYPES.GRADE) {
            setFilter(FILTER_TYPES.GRADE, {min: 0, max: 18})
            let gradeTag = self.shadowRoot.querySelector(`.tag[data-filter-type="${filterTypeToHtml(FILTER_TYPES.GRADE)}"]`)
            gradeTag.dispatchEvent(new Event('mousedown'))
            gradeTag.focus()
        } else if (filterType === FILTER_TYPES.SETTER) {
            setFilter(FILTER_TYPES.SETTER, GlobalState.user)
            state.editedFilterType = filterType
            let setterTag = self.shadowRoot.querySelector(`.tag[data-filter-type="${filterTypeToHtml(FILTER_TYPES.SETTER)}"]`)
            setterTag.dispatchEvent(new Event('mousedown'))
            setterTag.focus()
        } else if (filterType === FILTER_TYPES.IN_LIST) {
            setFilter(FILTER_TYPES.IN_LIST, "list")
            state.editedFilterType = filterType
            let listTag = self.shadowRoot.querySelector(`.tag[data-filter-type="${filterTypeToHtml(FILTER_TYPES.IN_LIST)}"]`)
            listTag.dispatchEvent(new Event('mousedown'))
            listTag.focus()
        } else if (filterType === FILTER_TYPES.RATING) {
            setFilter(FILTER_TYPES.RATING, 1)
            state.editedFilterType = filterType
            let ratingTag = self.shadowRoot.querySelector(`.tag[data-filter-type="${filterTypeToHtml(FILTER_TYPES.RATING)}"]`)
            ratingTag.dispatchEvent(new Event('mousedown'))
            ratingTag.focus()
        } else if (filterType === FILTER_TYPES.LIKED_ROUTES) {
            setFilter(FILTER_TYPES.LIKED_ROUTES, true)
        } else if (filterType === FILTER_TYPES.SENT_BY_ME) {
            setFilter(FILTER_TYPES.SENT_BY_ME, true)
        } else if (filterType === FILTER_TYPES.NOT_SENT_BY_ME) {
            setFilter(FILTER_TYPES.NOT_SENT_BY_ME, true)
        }
    }

    function existingFilterClicked(e, filter) {
        if (filter.type === FILTER_TYPES.GRADE) {
            let _dropdown = self.shadowRoot.querySelector("#edit-filter-dialog")
            if (state.editedFilterType === filter.type) {
                _dropdown.toggle(self, true)
            } else {
                // If we're clicking a different filter, we shouldn't close the dialog
                _dropdown.close()
                requestAnimationFrame(() => _dropdown.open(self, true))
            }
            state.editedFilterType = filter.type
        } else if (filter.type === FILTER_TYPES.SETTER) {
            let _dropdown = self.shadowRoot.querySelector("#edit-filter-dialog")
            let setterTag = self.shadowRoot.querySelector(`.tag[data-filter-type="${filterTypeToHtml(FILTER_TYPES.SETTER)}"]`)
            if (state.editedFilterType === filter.type) {
                _dropdown.toggle(setterTag, true)
            } else {
                // If we're clicking a different filter, we shouldn't close the dialog
                _dropdown.close()
                requestAnimationFrame(() => _dropdown.open(setterTag, true))
            }
            state.editedFilterType = filter.type
        } else if (filter.type === FILTER_TYPES.IN_LIST) {
            let _dropdown = self.shadowRoot.querySelector("#edit-filter-dialog")
            let listTag = self.shadowRoot.querySelector(`.tag[data-filter-type="${filterTypeToHtml(FILTER_TYPES.IN_LIST)}"]`)
            if (state.editedFilterType === filter.type) {
                _dropdown.toggle(listTag, true)
            } else {
                // If we're clicking a different filter, we shouldn't close the dialog
                _dropdown.close()
                requestAnimationFrame(() => _dropdown.open(listTag, true))
            }
            state.editedFilterType = filter.type
        } else if (filter.type === FILTER_TYPES.RATING) {
            let _dropdown = self.shadowRoot.querySelector("#edit-filter-dialog")
            let ratingTag = self.shadowRoot.querySelector(`.tag[data-filter-type="${filterTypeToHtml(FILTER_TYPES.RATING)}"]`)
            if (state.editedFilterType === filter.type) {
                _dropdown.toggle(ratingTag, true)
            } else {
                // If we're clicking a different filter, we shouldn't close the dialog
                _dropdown.close()
                requestAnimationFrame(() => _dropdown.open(ratingTag, true))
            }
            state.editedFilterType = filter.type
        } else if (filter.type === FILTER_TYPES.LIKED_ROUTES) {
            GlobalState.filters = GlobalState.filters.filter(f => f.type !== FILTER_TYPES.LIKED_ROUTES)
        } else if (filter.type === FILTER_TYPES.SENT_BY_ME) {
            GlobalState.filters = GlobalState.filters.filter(f => f.type !== FILTER_TYPES.SENT_BY_ME)
        } else if (filter.type === FILTER_TYPES.NOT_SENT_BY_ME) {
            GlobalState.filters = GlobalState.filters.filter(f => f.type !== FILTER_TYPES.NOT_SENT_BY_ME)
        }
    }

    return html(GlobalState, state)`
<style>
    :host {
        display: flex;
        overflow-x: auto;
        gap: 3px;
        margin-top: 3px;
        padding-bottom: 5px;
        /*flex-wrap: wrap;*/
        min-height: 30px; /* Shit fix for iphone, find better solution*/
        /*min-height: fit-content;*/
    }
    
    x-dialog {
        background-color: var(--background-color);
        color: var(--text-color);
        white-space: nowrap;
    }
    
    .tag {
        display: flex;
        align-items: center;
        border-radius: 100px;
        font-size: 14px;
        padding: 5px 10px;
        gap: 5px;
        background-color: var(--secondary-color-weak-3);
        border: 0 solid var(--secondary-color);
        color: var(--secondary-color);
        box-shadow: none;
        white-space: nowrap;
        min-width: fit-content;
    }
    
    .tag > .delete-icon {
        padding: 3px;
        color: var(--text-color-weak-1);
    }
    
    .dropdown-list-dialog {
        max-height: 395px;
        overflow-y: auto;
    }
    
    .dropdown-list-dialog > .item {
        padding: 10px 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .dropdown-list-dialog > .item > .item-icon {
        width: 18px;
        text-align: center;
    }
    
    .dropdown-list-dialog > .item:hover {
        background-color: var(--hover-color);
    }
    
    .dropdown-list-dialog > .item[data-selected] {
        color: var(--secondary-color);
    }
    
    .stars-dialog {
        padding: 10px 20px;
        --star-size: 20px;
        --star-padding: 5px;
    }
    
    #sorting-tag > x-icon {
        transform: rotate(90deg) scaleX(0.8);;
    }
    
    #add-filter-tag {
        border: none;
        background-color: var(--background-color-3);
        color: var(--text-color-weak-1);
    }
    
    #v-slider-container {
        display: flex;
        width: 80vw;
        gap: 20px;
        padding: 10px 20px;
        align-items: center;
    }
    
    #v-slider-container > .v-number {
        min-width: 22px;
        max-width: 22px;
    }
    
    x-double-slider {
        --circle-color: var(--secondary-color);
        width: 80vw;
    }
    
</style>

<x-button 
    id="sorting-tag"
    class="tag"
    tabindex="0"
    onmousedown=${() => () => {
        let _dropdown = self.shadowRoot.querySelector("#sorting-dialog")
        let _button = self.shadowRoot.querySelector("#sorting-tag")
        _dropdown.toggle(_button, true)
    }}
    onblur=${() => requestAnimationFrame(() => self.shadowRoot.querySelector("#sorting-dialog").close())}>
    <x-icon icon="fa fa-exchange-alt"></x-icon>
    ${() => GlobalState.sorting}
</x-button>
<x-dialog id="sorting-dialog"
          class="dropdown-list-dialog">
    ${() => [...Object.values(SORT_TYPES)].map(sortType => html()`
    <div class="sort-type item"
         data-selected=${() => GlobalState.sorting === sortType}
         onclick=${() => {
             self.shadowRoot.querySelector("#sorting-dialog").close()
             GlobalState.sorting = sortType
             sortRoutes()
         }}>
        ${sortType}
    </div>
    `)}
</x-dialog>

${() => GlobalState.filters.map(filter => html(filter)`
<x-button class="tag"
          data-filter-type=${() => filterTypeToHtml(filter.type)}
          tabindex="0"
          onmousedown=${e => existingFilterClicked(e, filter)}
          onblur=${() => requestAnimationFrame(() => {
              if (filter.type === state.editedFilterType) {
                  self.shadowRoot.querySelector("#edit-filter-dialog").close()
              }
          })}>
    <div class="tag-content" 
         style="border-right: 1px solid var(--text-color-weak-2); padding-right: 6px;">
    ${() => {
        // Renders filter
        if (filter.type === FILTER_TYPES.GRADE) {
            return filter.value.min === filter.value.max ? `V${filter.value.min}` : `V${filter.value.min} - V${filter.value.max}`
        } else if (filter.type === FILTER_TYPES.SETTER) {
            return html()`
            <div style="display: flex; align-items: center; gap: 5px;">
                <x-icon icon="fa fa-user" style="color: var(--text-color-weak);"></x-icon>
                ${filter.value.id === GlobalState.user.id ? "Me" : filter.value.nickname}
            </div>
            `
        } else if (filter.type === FILTER_TYPES.RATING) {
            return html()`
            <div class="stars-container"
                 style="display: flex; align-items: center">
                <div>Rating: </div>
                <x-rating rating=${() => filter.value}
                          onlyactive
                          style="--star-size: 12px; --star-padding: 0; margin-left: 3px;"></x-rating>
            </div>
            `
        } else if (filter.type === FILTER_TYPES.LIKED_ROUTES) {
            return html()`
            <div style="display: flex; align-items: center; gap: 5px;">
                <x-icon icon="fa fa-heart" style="color: var(--love-color);"></x-icon>
                Liked
            </div>
            `
        } else if (filter.type === FILTER_TYPES.SENT_BY_ME) {
            return html()`
            <div style="display: flex; align-items: center; gap: 5px;">
                <x-icon icon="fa fa-check" style="color: var(--great-success-color);"></x-icon>
                Sent
            </div>
            `
        } else if (filter.type === FILTER_TYPES.NOT_SENT_BY_ME) {
            return html()`
            <div style="display: flex; align-items: center; gap: 5px;">
                <x-icon icon="fa fa-times" style="color: var(--danger-zone-color);"></x-icon>
                Not sent
            </div>
            `
        } else if (filter.type === FILTER_TYPES.IN_LIST) {
            return html()`
            <div style="display: flex; align-items: center; gap: 5px;">
                <x-icon icon="fa fa-list-ul" style="color: var(--text-color-weak);"></x-icon>
                ${filter.value}
            </div>
            `
        }
    }}
    </div>
    <x-icon class="delete-icon" 
            icon="fa fa-times"
            onmousedown=${e => {
                GlobalState.filters = GlobalState.filters.filter(f => f.type !== filter.type)
                e.stopPropagation()
            }}></x-icon>
</x-button>
`)}
<x-dialog id="edit-filter-dialog">
    ${() => {
        let existingFilter = GlobalState.filters.find(filter => filter.type === state.editedFilterType)
        let thisDialog = self.shadowRoot.querySelector("#edit-filter-dialog")
        if (state.editedFilterType === FILTER_TYPES.GRADE) {
            if (existingFilter == null) {
                return
            }
            let sliderState = {min: existingFilter.value.min || 0, max: existingFilter.value.max || 0}
            return html(sliderState)`
            <div id="v-slider-container">
                <div class="v-number">V${() => sliderState.min}</div>
                <x-double-slider initvaluemin=${existingFilter.value.min}
                                 initvaluemax=${existingFilter.value.max}
                                 min="0"
                                 max="18"
                                 step
                                 updated=${() => ({min, max}) => {
                                     existingFilter.value.min = Math.round(min)
                                     existingFilter.value.max = Math.round(max)
                                     sliderState.min = existingFilter.value.min
                                     sliderState.max = existingFilter.value.max
                                 }}
                                 released=${() => () => setFilter(FILTER_TYPES.GRADE, existingFilter.value)}>
                </x-double-slider>
                <div class="v-number">V${() => sliderState.max}</div>
            </div>
            `
        } else if (state.editedFilterType === FILTER_TYPES.SETTER) {
            if (existingFilter == null) {
                return
            }
            return html()`
            <div class="dropdown-list-dialog">
                ${() => [GlobalState.user, ...GlobalState.selectedWall.users.filter(user => user.id !== GlobalState.user.id)]
                .map(user => html()`
                <div class="item"
                     data-selected=${() => user.id === GlobalState.filters.find(filter => filter.type === FILTER_TYPES.SETTER)?.value?.id}
                     onclick=${() => {
                         setFilter(FILTER_TYPES.SETTER, user)
                         requestAnimationFrame(() => self.shadowRoot.querySelector("#edit-filter-dialog").close())
                     }}>
                    ${() => user.id === GlobalState.user.id ? "Me" : user.nickname}</div>
                `)}
            </div>
            `
        } else if (state.editedFilterType === FILTER_TYPES.IN_LIST) {
            if (existingFilter == null) {
                return
            }
            return html()`
            <div class="dropdown-list-dialog">
                ${() => GlobalState.lists.map(list => html()`
                <div class="item"
                     data-selected=${() => list === GlobalState.filters.find(filter => filter.type === FILTER_TYPES.IN_LIST)?.value}
                     onclick=${() => {
                         setFilter(FILTER_TYPES.IN_LIST, list)
                         requestAnimationFrame(() => self.shadowRoot.querySelector("#edit-filter-dialog").close())
                     }}>
                    ${() => list}
                </div>
                `)}
            </div>
            `
        } else if (state.editedFilterType === FILTER_TYPES.RATING) {
            if (existingFilter == null) {
                return
            }
            return html()`
            <div class="stars-dialog">
                <x-rating rating=${() => existingFilter.value}
                          picked=${() => stars => {
                                setFilter(FILTER_TYPES.RATING, stars)
                                requestAnimationFrame(() => self.shadowRoot.querySelector("#edit-filter-dialog").close())
                            }}></x-rating>
            </div>
            `
        }
    }}
</x-dialog>

<x-button id="add-filter-tag"
          class="tag"
          tabindex="0"
          onmousedown=${() => () => {
              let _dropdown = self.shadowRoot.querySelector("#add-filter-dialog")
              let _button = self.shadowRoot.querySelector("#add-filter-tag")
              _dropdown.toggle(_button, true)
          }}
          onblur=${() => requestAnimationFrame(() => self.shadowRoot.querySelector("#add-filter-dialog").close())}>
    Add filter
    <x-icon icon="fa fa-plus"></x-icon>
</x-button>
<x-dialog id="add-filter-dialog" 
          class="dropdown-list-dialog">
    ${() => [...Object.values(FILTER_TYPES)]
        .filter(filterType => !GlobalState.filters.find(filter => filter.type === filterType))
        .map(filterType => html()`
    <div class="filter-type item"
         onclick=${() => createFilter(filterType)}>
        ${() => {
            if (filterType === FILTER_TYPES.GRADE) {
                return html()`<div class="item-icon" style="color: var(--secondary-color); font-weight: bold; scaleX(1.5) scaleY(1.2);">V</div>`
            } else if (filterType === FILTER_TYPES.SETTER) {
                return html()`<x-icon class="item-icon" icon="fa fa-user"></x-icon>`
            } else if (filterType === FILTER_TYPES.LIKED_ROUTES) {
                return html()`<x-icon class="item-icon" icon="fa fa-heart" style="color: var(--love-color);"></x-icon>`
            } else if (filterType === FILTER_TYPES.RATING) {
                return html()`<x-icon class="item-icon" icon="fa fa-star" style="color: #BFA100;"></x-icon>`
            } else if (filterType === FILTER_TYPES.SENT_BY_ME) {
                return html()`<x-icon class="item-icon" icon="fa fa-check" style="color: var(--great-success-color);"></x-icon>`
            } else if (filterType === FILTER_TYPES.NOT_SENT_BY_ME) {
                return html()`<x-icon class="item-icon" icon="fa fa-times" style="color: var(--danger-zone-color);"></x-icon>`
            } else if (filterType === FILTER_TYPES.IN_LIST) {
                return html()`<x-icon class="item-icon" icon="fa fa-list-ul"></x-icon>`
            }
        }}
        ${filterType}
    </div>
    `)}
</x-dialog>
`
})

export {SORT_TYPES, FILTER_TYPES}