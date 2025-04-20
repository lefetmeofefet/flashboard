import {html, createYoffeeElement} from "../../libs/yoffee/yoffee.min.js"
import {
    exitRoutePage, getFilteredRoutes,
    GlobalState,
    isAdmin,
    onBackClicked,
    toggleLikeRoute,
    toggleSentRoute, unselectHolds,
    WallImage
} from "../state.js"
import {Api} from "../api.js"
import {showToast} from "../../utilz/toaster.js";
import {Bluetooth} from "../bluetooth.js";
import {ROUTE_TYPES} from "/consts.js";


createYoffeeElement("single-route-page", (props, self) => {
    let state = {
        editMode: props.route?.isNew,
        editingTitle: false,
        highlightingRoute: GlobalState.autoLeds,
        editingLists: false,
    }
    let listsState = {}
    props.route?.lists?.forEach(list => listsState[list] = true)

    if (props.route?.isNew) {
        props.route.isNew = undefined
    }

    const setterId = () => {
        if (props.route != null) {
            return props.route.setters[0]?.id
        }
    }
    const setterName = () => {
        if (props.route != null) {
            let setter = props.route.setters[0]
            if (setter == null) {
                return
            }
            return setter.id === GlobalState.user.id ? "Me" : setter.nickname
        }
    }

    const saveRoute = async () => {
        if (props.route == null) {
            // This can happen when navigating back without focusing out of the input
            return
        }
        let selectedRoute = props.route
        let name = self.shadowRoot.querySelector("#route-name-input").getValue()

        await Api.updateRoute(selectedRoute.id, {name})
        selectedRoute.name = name
    }

    // set holds in route
    if (props.route != null) {
        for (let {id, holdType} of props.route.holds) {
            let hold = GlobalState.holdMapping.get(id)
            hold.inRoute = true
            hold.holdType = holdType
        }
    }

    let _handlingClick = false
    const holdClicked = async (hold, isLongPress) => {
        if (_handlingClick) {
            return
        }
        _handlingClick = true
        try {
            if (!state.editMode) {
                showToast("Click the edit button to edit the route")
            }

            if (GlobalState.loading) {
                // dont allow race conditions
                return
            }

            let holdWasInRoute = hold.inRoute

            if (state.editMode) {
                if (isLongPress) {
                    if (hold.inRoute) {
                        // If it's in route, remove hold from route
                        hold.holdType = ""
                        hold.inRoute = false
                    } else {
                        // If it's not in route, add it as finish hold
                        hold.holdType = "finish"
                        hold.inRoute = true
                    }
                } else {
                    if (!hold.inRoute) {
                        hold.inRoute = true
                        hold.holdType = ""
                    } else if (hold.holdType === "") {
                        hold.holdType = "start"
                    } else if (hold.holdType === "start") {
                        hold.holdType = "finish"
                    } else if (hold.holdType === "finish") {
                        hold.holdType = "foot"
                    } else if (hold.holdType === "foot") {
                        hold.holdType = ""
                        hold.inRoute = false
                    }
                }

                // Set Bluetooth LED
                if (state.highlightingRoute) {
                    await Bluetooth.setHoldState(hold)
                }

                // Update DB
                if (holdWasInRoute) {
                    await Api.removeHoldFromRoute(hold.id, props.route.id)
                    if (hold.inRoute) {
                        // If we just change its type, we have to remove it to add it again with a different holdType
                        await Api.addHoldToRoute(hold.id, props.route.id, hold.holdType)
                        props.route.holds.find(h => h.id === hold.id).holdType = hold.holdType
                    } else {
                        props.route.holds = props.route.holds.filter(h => h.id !== hold.id)
                    }
                } else {
                    await Api.addHoldToRoute(hold.id, props.route.id, hold.holdType)
                    props.route.holds.push({id: hold.id, ledId: hold.ledId, holdType: hold.holdType})
                }
            }
        } finally {
            _handlingClick = false
        }
    }

    self.onConnect = () => {

    }

    let mockPage
    let lastX = 0
    let lastXDiff = 0
    let nextRoute = () => {
        let filteredRoutes = getFilteredRoutes()
        let nextRoute = filteredRoutes.indexOf(props.route) + 1
        nextRoute = nextRoute % filteredRoutes.length
        return filteredRoutes[nextRoute]
    }
    let previousRoute = () => {
        let filteredRoutes = getFilteredRoutes()
        let nextRoute = filteredRoutes.indexOf(props.route) - 1
        nextRoute = nextRoute % filteredRoutes.length
        return filteredRoutes[nextRoute]
    }
    const onSwipe = x => {
        if (x !== 0 && mockPage == null) {
            mockPage = document.createElement("single-route-page")
            mockPage.style.position = "absolute"
            mockPage.style.width = self.offsetWidth + "px"
            mockPage.style.height = self.offsetHeight + "px"
            mockPage.style.top = self.offsetTop + "px"
            if (x < 0) {
                mockPage.style.left = self.offsetWidth + "px"
            } else {
                mockPage.style.left = -self.offsetWidth + "px"
            }
            self.shadowRoot.appendChild(mockPage)
            self.style.overflow = "visible"
        }

        if (mockPage != null) {
            if (x < 0 && lastX >= 0) {
                mockPage.style.left = self.offsetWidth + "px"
                mockPage.props.route = nextRoute()
            }
            if (x > 0 && lastX <= 0) {
                mockPage.style.left = -self.offsetWidth + "px"
                mockPage.props.route = previousRoute()
            }
        }
        self.style.transform = `translateX(${x}px)`
        lastXDiff = x - lastX
        lastX = x
    }

    const onSwipeEnd = () => {
        self.style.transform = null
        mockPage.remove()
        mockPage = null
        self.style.overflow = null

        // Check if we swiped enough and then check if direction of movement is with the swipe, then swap route
        if (Math.abs(lastX) > self.offsetWidth * 0.3) {
            if (lastX < 0 && lastXDiff < 0) {
                unselectHolds()
                GlobalState.selectedRoute = nextRoute()
            }
            if (lastX > 0 && lastXDiff > 0) {
                unselectHolds()
                GlobalState.selectedRoute = previousRoute()
            }
        }
        lastX = 0
    }

    return html(GlobalState, state, props, props.route || {})`
<style>
    :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        overflow: hidden;
    }
    
    #bottom-row {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: 36px;
        justify-content: space-between;
    }
    
    #bottom-row > #setter-container, #bottom-row > #grade-container, #bottom-row > #type-container {
        display: flex;
        align-items: center;
        gap: 4px;
        height: 30px;
        font-size: 14px;
        opacity: 0.8;
    }
    
    #setter-button, #grade-button, #type-button {
        gap: 6px;
        padding: 1px 6px;
        box-shadow: none;
        white-space: nowrap;
    }
    
    #grade-button {
        font-size: 16px;
    }
    
    x-dialog {
        background-color: var(--background-color);
        color: var(--text-color);
    }
    
    x-checkbox {
        --on-color: var(--secondary-color);
    }
    
    #grade-dialog, #setter-dialog {
        max-height: 395px;
        overflow-y: auto;
    }
    
    .header-dialog > .item {
        padding: 10px 20px;
        cursor: pointer;
        white-space: nowrap;
    }
    
    #grade-dialog > .item {
        padding: 8px 20px;
    }
    
    .header-dialog > .item:hover {
        background-color: var(--hover-color);
    }
    
    .header-dialog > .item[data-selected] {
        color: var(--secondary-color);
    }
    
    #stars-dialog {
        padding: 10px 20px;
        --star-size: 20px;
        --star-padding: 5px;
    }
    
    .header-input {
        background-color: transparent;
        width: -webkit-fill-available;
        /*border: 1px solid #00000010;*/
    }
    
    wall-element {
    
    }
    
    #bottom-buttons {
        display: flex;
        align-items: center;
        justify-content: space-evenly;
        height: 50px;
        min-height: 44px;
    }
    
    #bottom-buttons > x-button {
        border-radius: 1000px;
        color: var(--text-color-weak);
        background-color: var(--background-color-3);
        width: 20px;
        height: 20px;
        gap: 10px;
    }
    
    #bottom-buttons > #heart-button[liked] {
        background-color: var(--love-color);
        color: var(--text-color-on-secondary);
    }
    
    #bottom-buttons > #edit-button[active] {
        background-color: var(--secondary-color);
        color: var(--text-color-on-secondary);
    }
    
    #bottom-buttons > #log-send-button[active] {
        background-color: var(--great-success-color);
        color: var(--text-color-on-secondary);
    }
    
    #bottom-buttons > #star-button {
        padding-right: 20px;
        padding-left: 20px;
    }
    
    #bottom-buttons > #turn-on-leds-button {
    }
    
    #bottom-buttons > #turn-on-leds-button[active] {
        background-color: var(--secondary-color);
        color: var(--text-color-on-secondary);
    }
    
    #bottom-buttons > #finish-button {
        width: unset;
        background-color: var(--secondary-color);
    }
    
    yoffee-list-location-marker {
        display: none;
    }
</style>

<secondary-header showconfirmbutton=${() => state.editingTitle}
                  whenclosed=${() => () => state.editingLists = false}>
    <text-input id="route-name-input"
                class="header-input"
                slot="title"
                disabled=${() => GlobalState.user.id !== setterId() && !isAdmin()}
                value=${() => props.route?.name}
                changed=${() => async () => {
                    await saveRoute()
                }}
                onblur=${() => state.editingTitle = false}
                onfocus=${e => {
                    if (!e.target.selected) {
                        e.target.select()
                        state.editingTitle = true
                    }
                }}
    ></text-input>
    
    ${() => state.editingLists ? renderEditLists() : renderMenu()}
    
    <div id="bottom-row"
         slot="bottom-row">
        <div id="setter-container">
            <div id="setter-prefix">Setter:</div>
            <x-button id="setter-button"
                      tabindex="0"
                      onmousedown=${() => () => {
                          if (GlobalState.user.id === setterId() || isAdmin()) {
                              let _dropdown = self.shadowRoot.querySelector("#setter-dialog")
                              let _button = self.shadowRoot.querySelector("#setter-button")
                              _dropdown.toggle(_button, true)
                          } else {
                              alert(`Cannot change route, owner is ${props.route.setters[0]?.nickname}`)
                          }
                      }}
                      onblur=${() => requestAnimationFrame(() => self.shadowRoot.querySelector("#setter-dialog").close())}>
                ${() => setterName()}
                <x-icon icon="fa fa-caret-down"></x-icon>
            </x-button>
        </div>
        <x-dialog id="setter-dialog"
                  class="header-dialog">
            ${() => [GlobalState.user, ...(GlobalState.selectedWall?.users || []).filter(user => user.id !== GlobalState.user.id)]
            .map(user => html()`
            <div class="item"
                 data-selected=${() => setterId() === user.id}
                 onclick=${async () => {
                     props.route.setters = [{id: user.id, nickname: user.nickname}]
                     self.shadowRoot.querySelector("#setter-dialog").close()
                     await Api.updateRoute(props.route.id, {setterId: user.id})
                 }}>
                ${GlobalState.user === user ? "Me" : user.nickname}
            </div>
            `)}
        </x-dialog>
        
        <div id="grade-container">
<!--            <div id="grade-prefix">Grade:</div>-->
            <x-button id="grade-button"
                      tabindex="0"
                      onmousedown=${() => () => {
                            if (GlobalState.user.id === setterId() || isAdmin()) {
                                let _dropdown = self.shadowRoot.querySelector("#grade-dialog")
                                let _button = self.shadowRoot.querySelector("#grade-button")
                                _dropdown.toggle(_button, true)
                            } else {
                                alert(`Cannot change route, owner is ${props.route.setters[0]?.nickname}`)
                            }
                        }}
                      onblur=${() => requestAnimationFrame(() => self.shadowRoot.querySelector("#grade-dialog").close())}>
                V${() => props.route?.grade}
                <x-icon icon="fa fa-caret-down"></x-icon>
            </x-button>
        </div>
        <x-dialog id="grade-dialog"
                  class="header-dialog">
            ${() => new Array(18).fill(0).map((_, index) => index + 1)
            .map(grade => html()`
                <div class="item"
                     data-selected=${() => grade === props.route?.grade}
                     onclick=${async () => {
                         props.route.grade = grade
                         self.shadowRoot.querySelector("#grade-dialog").close()
                         await Api.updateRoute(props.route.id, {grade})
                     }}>
                V${grade}
            </div>
            `)}
        </x-dialog>
        
        <div id="type-container">
<!--            <div id="type-prefix">Type:</div>-->
            <x-button id="type-button"
                      tabindex="0"
                      onmousedown=${() => () => {
                            if (GlobalState.user.id === setterId() || isAdmin()) {
                                let _dropdown = self.shadowRoot.querySelector("#type-dialog")
                                let _button = self.shadowRoot.querySelector("#type-button")
                                _dropdown.toggle(_button, true)
                            } else {
                                alert(`Cannot change route, owner is ${props.route.setters[0]?.nickname}`)
                            }
                        }}
                      onblur=${() => requestAnimationFrame(() => self.shadowRoot.querySelector("#type-dialog").close())}>
                ${() => props.route?.type}
                <x-icon icon="fa fa-caret-down"></x-icon>
            </x-button>
        </div>
        <x-dialog id="type-dialog"
                  class="header-dialog">
            ${() => [...Object.values(ROUTE_TYPES)]
                .map(routeType => html()`
                <div class="item"
                     data-selected=${() => routeType === props.route?.type}
                     onclick=${async () => {
                        props.route.type = routeType
                        self.shadowRoot.querySelector("#type-dialog").close()
                        await Api.updateRoute(props.route.id, {type: routeType})
                    }}>
                ${() => routeType}
            </div>
            `)}
        </x-dialog>
    </div>
</secondary-header>

<wall-element showallholds=${() => state.editMode}
              hideholds=${() => props.route == null}
              onclickhold=${e => holdClicked(e.detail.hold, e.detail.long)}
              onborderswipe=${e => onSwipe(e.detail.x)}
              onborderswipeend=${() => onSwipeEnd()}
              >
</wall-element>

<div id="bottom-buttons">
    ${() => state.editMode ? html()`
    <!-- Important for making justify-content: space-evenly work-->
    <div id="placeholder" style="width: 52px;"></div>
    <x-button id="finish-button"
              active
              onclick=${() => state.editMode = false}>
        <x-icon icon="fa fa-check"></x-icon>
        Finish editing
    </x-button>
    ` : html()`
    <x-button id="heart-button"
              liked=${() => props.route?.liked} 
              onclick=${() => toggleLikeRoute(props.route)}>
        <x-icon icon="fa fa-heart"></x-icon>
    </x-button>
    
    <x-button id="star-button"
              tabindex="0"
              onclick=${async () => {
                  let _dropdown = self.shadowRoot.querySelector("#stars-dialog")
                  let _button = self.shadowRoot.querySelector("#star-button")
                  _dropdown.toggle(_button, true, 50, "top")
              }}
              onblur=${() => requestAnimationFrame(() => self.shadowRoot.querySelector("#stars-dialog").close())}>
        <x-rating rating=${() => props.route?.starsAvg}
                  onestar
        ></x-rating>
    </x-button>
    <x-dialog id="stars-dialog"
              class="header-dialog">
        <x-rating rating=${() => props.route?.userStars}
                  picked=${() => async stars => {
                      props.route.userStars = stars
                      let response = await Api.starRoute(props.route.id, stars)
                      props.route.starsAvg = response.starsAvg
                      GlobalState.selectedWall.starredRoutes[props.route.id] = stars
                      requestAnimationFrame(() => self.shadowRoot.querySelector("#stars-dialog").close())
                  }}></x-rating>
    </x-dialog>
    
    <x-button id="log-send-button"
              active=${() => props.route?.sent}
              onclick=${() => toggleSentRoute(props.route)}>
        <x-icon icon="fa fa-check"></x-icon>
    </x-button>
    
    <x-button id="edit-button"
              active=${() => state.editMode}
              onclick=${async () => {
                  if (GlobalState.user.id === setterId() || isAdmin()) {
                      state.editMode = true
                      if (!localStorage.getItem("edit-holds-toasted")) {
                          localStorage.setItem("edit-holds-toasted", "true")
                          showToast("Click holds to edit the route, long press to remove hold")
                      }
                  } else {
                      alert(`Cannot change route, owner is ${props.route.setters[0]?.nickname}`)
                  }
              }}>
        <x-icon icon="fa fa-edit"></x-icon>
    </x-button>
    
    `}
    
    <x-button id="turn-on-leds-button"
              active=${() => state.highlightingRoute}
              onclick=${async () => {
                    if (state.highlightingRoute) {
                        await Bluetooth.clearLeds()
                    } else {
                        await Bluetooth.highlightRoute(props.route)
                    }
            
                    state.highlightingRoute = !state.highlightingRoute
                }}>
        <x-icon icon="fa fa-lightbulb"></x-icon>
    </x-button>
</div>
`

    function renderMenu() {
        let allowedToChange = GlobalState.user.id === setterId() || isAdmin()

        return html()`
        <x-button slot="dialog-item"
                  onclick=${async () => {}}>
            ${() => props.route?.time}
        </x-button>
        <x-button slot="dialog-item"
                  onclick=${async () => {
            if (props.route?.sends > 0) {
                let senders = await Api.getRouteSenders(props.route.id)
                alert("Senders:\n" + senders.map(sender => "- " + sender.nickname).join("\n"))
            }
        }}>
            <x-icon icon="fa fa-check" style="width: 20px;"></x-icon>
            ${() => props.route?.sends} sends
        </x-button>
        <x-button slot="dialog-item"
                  onclick=${() => state.editingLists = true}>
            <x-icon icon="fa fa-plus" style="width: 20px;"></x-icon>
            Add to list
        </x-button>
        ${() => allowedToChange && html()`
        <x-button slot="dialog-item"
                  onclick=${() => self.shadowRoot.querySelector("#route-name-input")?.focus()}>
            <x-icon icon="fa fa-edit" style="width: 20px;"></x-icon>
            Edit route name
        </x-button>
        <x-button slot="dialog-item"
                  onclick=${async () => {
            if (confirm(`Delete route ${props.route.name}?`)) {
                await Api.deleteRoute(props.route.id)
                await exitRoutePage()
            }
        }}>
            <x-icon icon="fa fa-trash" style="width: 20px;"></x-icon>
            Delete route
        </x-button>
        <x-button slot="dialog-item"
                  onclick=${async () => {
            console.log("date pressed hmm?")
        }}>
            <x-icon icon="fa fa-clock" style="width: 20px;"></x-icon>
            Created ${() => dayjs(props.route?.createdAt).format('DD-MM-YY HH:mm:ss')}
        </x-button>
        `}`
    }

    function renderEditLists() {
        return html()`
        ${() => GlobalState.lists.map(list => html(listsState)`
        <x-button slot="dialog-item" 
                  onclick=${async e => {
            e.stopPropagation()
            listsState[list] = !listsState[list]
            let currentLists = props.route.lists || []
            let lists = listsState[list] ? [...currentLists, list] : currentLists.filter(l => l !== list)
            props.route.lists = lists
            await Api.updateRoute(
                props.route.id,
                {lists}
            )
        }}>
            <x-checkbox value=${() => listsState[list]}></x-checkbox>
            ${() => list}
        </x-button>
        `)}
        
        <x-button slot="dialog-item" 
                  onclick=${async e => {
            e.stopPropagation()
            let list = prompt("Enter new list name")
            if (list != null) {
                listsState[list] = true

                props.route.lists = [...(props.route.lists || []), list]
                GlobalState.lists = [...GlobalState.lists, list].sort((a, b) => a < b ? -1 : 1)
                await Api.updateRoute(
                    props.route.id,
                    {lists: props.route.lists}
                )
            }
        }}>
            <x-icon icon="fa fa-plus" style="width: 26px;"></x-icon>
            Create new list
        </x-button>
        `
    }
})
