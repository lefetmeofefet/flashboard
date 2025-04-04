
function zoomify(element, {
    parent = null,
    stretchToParent = false,
    wheelZoomSpeed = 0.005,
    minZoom = 1,
    maxZoom = 5,
    onZoom = null,
    onDrag = null,
    onInteraction = null,
    numFingersChanged = null,
    onBorderSwipe = null
} = {}) {
    element.style.transformOrigin = "0 0"
    // Transition to make it smoother, but it feels slow...
    // element.style.transition = "transform 0.05s"

    let zoom = 1, x = 0, y = 0

    element.cover = () => {
        zoom = Math.max(parent.offsetWidth / element.offsetWidth, parent.offsetHeight / element.offsetHeight)
        x = 0
        y = 0
        updatePositionAndZoom()
    }

    element.contain = () => {
        zoom = 1
        x = 0
        y = 0
        updatePositionAndZoom()
    }

    element.reset = () => {
        zoom = 1
        x = 0
        y = 0
        updatePositionAndZoom()
    }

    let xStretch = 1, yStretch = 1
    let hZoom = () => zoom * xStretch
    let vZoom = () => zoom * yStretch

    element.stretchToParent = () => {
        xStretch = parent.offsetWidth / element.offsetWidth
        yStretch = parent.offsetHeight / element.offsetHeight
        updatePositionAndZoom()
    }
    element.unStretchToParent = () => {
        xStretch = 1
        yStretch = 1
        updatePositionAndZoom()
    }
    if (stretchToParent) {
        element.stretchToParent()
    }

    // PC wheel zooming
    element.addEventListener("wheel", (event) => {
        event.preventDefault();
        let newZoom = zoom - event.deltaY * wheelZoomSpeed * zoom
        let mousePosition = {
            x: event.clientX - element.offsetLeft,
            y: event.clientY - element.offsetTop
        }

        dragAndZoom(mousePosition, mousePosition, {x, y}, zoom, newZoom)
    })

    let updatePositionAndZoom = () => {
        if (zoom < minZoom) {
            zoom = minZoom
        }
        if (zoom > maxZoom) {
            zoom = maxZoom
        }

        // Limit scrolling by parent
        if (parent != null) {
            let elementWidth = element.offsetWidth * hZoom()
            let elementX = element.offsetLeft + x
            let elementHeight = element.offsetHeight * vZoom()
            let elementY = element.offsetTop + y

            // If dimension is smaller than parent, then don't allow scrolling at all
            if (elementWidth <= parent.offsetWidth) {
                // need to center after zooming...
                x = -(elementWidth - element.offsetWidth) / 2
            }

            // If dimension is larger than parent, don't allow sliding in to create margin
            if (elementWidth > parent.offsetWidth) {
                if (elementX > parent.offsetLeft) {
                    x = parent.offsetLeft - element.offsetLeft
                }
                if (elementWidth + elementX < parent.offsetLeft + parent.offsetWidth) {
                    x = parent.offsetLeft + parent.offsetWidth - (element.offsetLeft + elementWidth)
                }
            }

            // Same with vertical
            if (elementHeight <= parent.offsetHeight) {
                // need to center after zooming...
                y = -(elementHeight - element.offsetHeight) / 2
            }

            // If dimension is larger than parent, don't allow sliding in to create margin
            if (elementHeight > parent.offsetHeight) {
                if (elementY > parent.offsetTop) {
                    y = parent.offsetTop - element.offsetTop
                }
                if (elementHeight + elementY < parent.offsetTop + parent.offsetHeight) {
                    y = parent.offsetTop + parent.offsetHeight - (element.offsetTop + elementHeight)
                }
            }
        }

        let hzoom = hZoom()
        let vzoom = vZoom()
        if (hzoom === 1) {
            hzoom = 1.00001 // strange hack fix for subpixel shift when zooming out, selecting hold, zooming in, selecting hold again and stuff jumps
        }
        if (vzoom === 1) {
            vzoom = 1.00001
        }
        let transform = `translate(${x}px, ${y}px) scale(${hzoom}, ${vzoom})`
        element.style.webkitTransform = transform
        element.style.mozTransform = transform
        element.style.msTransform = transform
        element.style.oTransform = transform
        element.style.transform = transform
    }

    let getMiddlePoint = touches => {
        let xSum = 0, ySum = 0
        for (let touch of touches) {
            xSum += touch.clientX - element.offsetLeft
            ySum += touch.clientY - element.offsetTop
        }
        return {
            x: xSum / touches.length,
            y: ySum / touches.length
        }
    }

    let getAvgDistance = (touches, point) => {
        let distance = 0
        for (let touch of touches) {
            distance += Math.sqrt(
                (touch.clientX - element.offsetLeft - point.x) * (touch.clientX - element.offsetLeft - point.x)
                + (touch.clientY - element.offsetTop - point.y) * (touch.clientY - element.offsetTop - point.y)
            )
        }
        return distance / touches.length
    }

    // Receives parameters in screen coordinates!
    let dragAndZoom = (oldDragPoint, newDragPoint, initialTranslatePoint, oldZoom, newZoom) => {
        onInteraction && onInteraction()

        if (newZoom < minZoom) {
            newZoom = minZoom
        }
        if (newZoom > maxZoom) {
            newZoom = maxZoom
        }
        let newX = newDragPoint.x - ((oldDragPoint.x - initialTranslatePoint.x) / (oldZoom * xStretch)) * (newZoom * xStretch)
        let newY = newDragPoint.y - ((oldDragPoint.y - initialTranslatePoint.y) / (oldZoom * yStretch)) * (newZoom * yStretch)
        if (x !== newX || y !== newY) {
            onDrag && onDrag()
        }
        x = newX
        y = newY
        if (zoom !== newZoom) {
            onZoom && onZoom()
            zoom = newZoom
        }

        updatePositionAndZoom()
    }

    let touchMoved = (oldMiddlePoint, newMiddlePoint, oldPinchDistance, newPinchDistance) => {
        let newZoom = zoom
        if (newPinchDistance > 0 && oldPinchDistance > 0) {
            newZoom = startZoom * newPinchDistance / oldPinchDistance
        }
        dragAndZoom(oldMiddlePoint, newMiddlePoint, {x: startX, y: startY}, startZoom, newZoom)

        // If nothing changed even though we panned, we'll call "onBorderSwipe"
        if (borderSwiping && startX === x && startY === y && startZoom === zoom) {
            onBorderSwipe && onBorderSwipe({
                x: newMiddlePoint.x - oldMiddlePoint.x,
                y: newMiddlePoint.y - oldMiddlePoint.y
            })
        } else {
            borderSwiping = false
        }
    }

    let navigating = false
    let touches = []
    // All these have to be in image coordinates
    let touchMiddlePoint, pinchDistance, startX, startY, startZoom, borderSwiping

    let initPinchDrag = () => {
        touchMiddlePoint = getMiddlePoint(touches)
        pinchDistance = getAvgDistance(touches, touchMiddlePoint)
        startX = x
        startY = y
        borderSwiping = true
        startZoom = zoom
        navigating = true
    }

    element.addEventListener('touchstart', function (event) {
        touches = event.touches
        initPinchDrag()
        numFingersChanged && numFingersChanged(event.touches.length)
    }, { passive: false })

    element.addEventListener('touchmove', function (event) {
        if (navigating) {
            let newTouchMiddlePoint = getMiddlePoint(event.touches)
            let newPinchDistance = getAvgDistance(event.touches, newTouchMiddlePoint)
            touchMoved(touchMiddlePoint, newTouchMiddlePoint, pinchDistance, newPinchDistance)
        }

        touches = event.touches
    }, { passive: false })

    element.addEventListener('touchend', function (event) {
        touches = event.touches
        if (touches.length === 0) {
            navigating = false
        } else {
            initPinchDrag()
        }
        numFingersChanged && numFingersChanged(event.touches.length)
    })

    // Initial update
    updatePositionAndZoom()
}

export {zoomify}
