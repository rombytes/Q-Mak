/**
 * Gesture System for Enhanced UI Interactions
 * Handles touch gestures, swipe actions, and mobile interactions
 */

class GestureSystem {
    constructor() {
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchEndX = 0;
        this.touchEndY = 0;
        this.minSwipeDistance = 50;
        this.maxSwipeTime = 300;
        this.swipeStartTime = 0;
        
        this.init();
    }
    
    init() {
        // Add touch event listeners
        document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: true });
        document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: true });
        
        // Add mouse events for desktop testing
        document.addEventListener('mousedown', this.handleMouseDown.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
        
        // Add gesture classes to body
        document.body.classList.add('gesture-enabled');
    }
    
    handleTouchStart(e) {
        this.touchStartX = e.changedTouches[0].screenX;
        this.touchStartY = e.changedTouches[0].screenY;
        this.swipeStartTime = Date.now();
    }
    
    handleTouchEnd(e) {
        this.touchEndX = e.changedTouches[0].screenX;
        this.touchEndY = e.changedTouches[0].screenY;
        this.handleGesture();
    }
    
    handleMouseDown(e) {
        this.touchStartX = e.screenX;
        this.touchStartY = e.screenY;
        this.swipeStartTime = Date.now();
    }
    
    handleMouseUp(e) {
        this.touchEndX = e.screenX;
        this.touchEndY = e.screenY;
        this.handleGesture();
    }
    
    handleGesture() {
        const swipeTime = Date.now() - this.swipeStartTime;
        if (swipeTime > this.maxSwipeTime) return;
        
        const deltaX = this.touchEndX - this.touchStartX;
        const deltaY = this.touchEndY - this.touchStartY;
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            // Horizontal swipe
            if (Math.abs(deltaX) > this.minSwipeDistance) {
                if (deltaX > 0) {
                    this.onSwipeRight();
                } else {
                    this.onSwipeLeft();
                }
            }
        } else {
            // Vertical swipe
            if (Math.abs(deltaY) > this.minSwipeDistance) {
                if (deltaY > 0) {
                    this.onSwipeDown();
                } else {
                    this.onSwipeUp();
                }
            }
        }
    }
    
    onSwipeLeft() {
        this.dispatchGestureEvent('swipeleft');
    }
    
    onSwipeRight() {
        this.dispatchGestureEvent('swiperight');
    }
    
    onSwipeUp() {
        this.dispatchGestureEvent('swipeup');
    }
    
    onSwipeDown() {
        this.dispatchGestureEvent('swipedown');
    }
    
    dispatchGestureEvent(type) {
        const event = new CustomEvent(type, {
            detail: {
                startX: this.touchStartX,
                startY: this.touchStartY,
                endX: this.touchEndX,
                endY: this.touchEndY
            }
        });
        document.dispatchEvent(event);
    }
}

// Initialize gesture system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.gestureSystem = new GestureSystem();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GestureSystem;
}
