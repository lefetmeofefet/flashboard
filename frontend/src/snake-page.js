import {html, createYoffeeElement} from "../libs/yoffee/yoffee.min.js"
import {GlobalState} from "./state.js";
import "./components/text-input.js"
import "./components/x-button.js"
import "./components/x-icon.js"
import "./components/x-tag.js"
import {Bluetooth} from "./bluetooth.js";

createYoffeeElement("snake-page", (props, self) => {
    let state = {

    };

    let color = {
        r: Math.floor(Math.random() * 255),
        g: Math.floor(Math.random() * 255),
        b: Math.floor(Math.random() * 255),
    }
    let maxX = Math.max(...GlobalState.holds.map(hold => hold.x))
    let maxY = Math.max(...GlobalState.holds.map(hold => hold.y))

    async function snakeHold(hold) {
        await Bluetooth.setSnakeModeLed(color.r, color.g, color.b, hold.ledIds[0])
    }

    async function unsnakeHold(hold) {
        await Bluetooth.setSnakeModeLed(0, 0, 0, hold.ledIds[0])
    }

    let currentHold
    let snakeHolds
    let directions = ["right", "left", "up", "down"]
    let direction
    let snakeLength

    function randomizeSnake() {
        currentHold = GlobalState.holds[Math.floor(Math.random() * GlobalState.holds.length)]
        snakeHolds = []
        direction = directions[Math.floor(Math.random() * directions.length)]
        snakeLength = 5
    }
    randomizeSnake()
    window.onKillPlayer = async playerColor => {
        if (playerColor.r === color.r && playerColor.g === color.g && playerColor.b === color.b) {
            let ledGroup = {r: 0, g: 0, b: 0, i: []}
            for (let hold of snakeHolds) {
                if (hold.ledIds != null && hold.ledIds.length > 0) {
                    ledGroup.i.push(hold.ledIds[0])
                }
            }
            await Bluetooth.setLeds([ledGroup])
            randomizeSnake()
        }
    }
    window.onPlayerAteApple = playerColor => {
        if (playerColor.r === color.r && playerColor.g === color.g && playerColor.b === color.b) {
            snakeLength += 1
        }
    }

    let interval = setInterval(async () => {
        if (Bluetooth.messageQueue.length > 1) {
            // Don't queue up endless snake moves when the bt connection is slow
            return
        }
        let closestHold = null, closestDistance
        for (let hold of GlobalState.holds) {
            for (let xOffset = -maxX; xOffset <= maxX; xOffset += maxX) {
                for (let yOffset = -maxY; yOffset <= maxY; yOffset += maxY) {
                    let x = hold.x + xOffset
                    let y = hold.y + yOffset
                    if (hold === currentHold) {
                        continue
                    }
                    let xdiff = Math.abs(x - currentHold.x)
                    let ydiff = Math.abs(y - currentHold.y)
                    if ((direction === "right" || direction === "left") && ydiff > xdiff) {
                        continue
                    }
                    if ((direction === "up" || direction === "down") && ydiff < xdiff) {
                        continue
                    }
                    if ((direction === "right" && x < currentHold.x)
                        || (direction === "left" && x > currentHold.x)
                        || (direction === "down" && y < currentHold.y)
                        || (direction === "up" && y > currentHold.y)
                    ) {
                        continue
                    }
                    let getDistance = (x1, y1, x2, y2) => Math.sqrt(
                        Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2))
                    let distance = getDistance(x, y, currentHold.x, currentHold.y)

                    if (closestHold == null || distance < closestDistance) {
                        closestDistance = distance
                        closestHold = hold
                    }
                }
            }
        }
        currentHold = closestHold
        snakeHolds.push(currentHold)
        await snakeHold(currentHold)
        if (snakeHolds.length > snakeLength) {
            await unsnakeHold(snakeHolds.shift())
        }
    }, 300)

    function rightPressed() {
        if (direction === "right") {
            direction = "down"
        } else if (direction === "down") {
            direction = "left"
        } else if (direction === "left") {
            direction = "up"
        } else if (direction === "up") {
            direction = "right"
        }
    }

    function leftPressed() {
        if (direction === "left") {
            direction = "down"
        } else if (direction === "down") {
            direction = "right"
        } else if (direction === "right") {
            direction = "up"
        } else if (direction === "up") {
            direction = "left"
        }
    }

    self.onDisconnect = () => {
        console.log("Disonnected snake pegg")
        clearInterval(interval)
    }

    return html(GlobalState, state)`
<style>
    :host {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        font-size: 40px
    }
    
    x-icon {
        border-radius: 20px;
        cursor: pointer;
        padding: 30px;
        flex: 1;
        background-color: var(--secondary-color);
        margin: 30px;
    }
    
    x-icon:hover {
        opacity: 0.8;
    }

</style>

<x-icon icon="keyboard_arrow_up"
        tabindex="0"
        onclick=${() => rightPressed()}
></x-icon>
<x-icon icon="keyboard_arrow_down"
        tabindex="0"
        onclick=${() => leftPressed()}
></x-icon>
`
});
