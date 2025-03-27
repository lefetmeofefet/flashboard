
function zoomify(element, {
    parent = null,
    wheelZoomSpeed = 0.005,
    minZoom = 1,
    maxZoom = 5,
    onZoom = null
} = {}) {
    let zoom = 1, x = 0, y = 0

    element.cover = () => {
        zoom = Math.max(parent.offsetWidth / element.offsetWidth, parent.offsetHeight / element.offsetHeight)
        updatePositionAndZoom()
    }

    element.contain = () => {
        zoom = 1
        updatePositionAndZoom()
    }

    element.reset = () => {
        zoom = 1
        x = 0
        y = 0
        updatePositionAndZoom()
    }

    element.style.transformOrigin = "0 0"
    // Transition to make it smoother, but it feels slow...
    // element.style.transition = "transform 0.05s"

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
        // Limit scrolling by parent
        if (parent != null) {
            let elementWidth = element.offsetWidth * zoom
            let elementX = element.offsetLeft + x
            let elementHeight = element.offsetHeight * zoom
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

        let transform = `translate(${x}px, ${y}px) scale(${zoom})`
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
        if (newZoom < minZoom) {
            newZoom = minZoom
        }
        if (newZoom > maxZoom) {
            newZoom = maxZoom
        }
        x = newDragPoint.x - ((oldDragPoint.x - initialTranslatePoint.x) / oldZoom) * newZoom
        y = newDragPoint.y - ((oldDragPoint.y - initialTranslatePoint.y) / oldZoom) * newZoom
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
    }

    let navigating = false
    let touches = []
    // All these have to be in image coordinates
    let touchMiddlePoint, pinchDistance, startX, startY, startZoom

    let initPinchDrag = () => {
        touchMiddlePoint = getMiddlePoint(touches)
        pinchDistance = getAvgDistance(touches, touchMiddlePoint)
        startX = x
        startY = y
        startZoom = zoom
        navigating = true
    }

    element.addEventListener('touchstart', function (event) {
        touches = event.touches
        initPinchDrag()
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
    })

    // Initial update
    updatePositionAndZoom()
}

export {zoomify}
