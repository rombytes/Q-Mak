/**
 * Mobile UI/UX Enhancements
 * Q-Mak Queue Management System
 * Handles mobile-specific interactions, gestures, and optimizations
 */

(function() {
    'use strict';

    // Mobile detection
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);

    // Initialize mobile enhancements
    function initMobileEnhancements() {
        if (window.innerWidth <= 768) {
            handleTouchInteractions();
            optimizeScrolling();
            enhanceCarouselGestures();
            addPullToRefreshPrevention();
            optimizeViewportHeight();
            enhanceMobileMenu();
            addHapticFeedback();
        }
    }

    // Handle touch interactions with visual feedback
    function handleTouchInteractions() {
        const touchElements = document.querySelectorAll('button, a, .touch-feedback');
        
        touchElements.forEach(element => {
            element.addEventListener('touchstart', function(e) {
                this.style.transition = 'transform 0.1s';
                this.style.transform = 'scale(0.97)';
            }, { passive: true });

            element.addEventListener('touchend', function(e) {
                this.style.transform = 'scale(1)';
            }, { passive: true });

            element.addEventListener('touchcancel', function(e) {
                this.style.transform = 'scale(1)';
            }, { passive: true });
        });
    }

    // Optimize smooth scrolling for mobile
    function optimizeScrolling() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerOffset = 80;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });

        // Hide/show bottom navigation on scroll (optional enhancement)
        let lastScrollTop = 0;
        const bottomNav = document.querySelector('nav.md\\:hidden');
        
        if (bottomNav) {
            window.addEventListener('scroll', function() {
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                
                if (scrollTop > lastScrollTop && scrollTop > 100) {
                    // Scrolling down
                    bottomNav.style.transform = 'translateY(100%)';
                } else {
                    // Scrolling up
                    bottomNav.style.transform = 'translateY(0)';
                }
                
                lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
            }, { passive: true });
        }
    }

    // Enhanced carousel gestures for mobile
    function enhanceCarouselGestures() {
        const carousel = document.getElementById('carouselWrapper');
        if (!carousel) return;

        let touchStartX = 0;
        let touchEndX = 0;
        let isDragging = false;

        carousel.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
            isDragging = true;
            carousel.style.cursor = 'grabbing';
        }, { passive: true });

        carousel.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            touchEndX = e.changedTouches[0].screenX;
        }, { passive: true });

        carousel.addEventListener('touchend', function(e) {
            isDragging = false;
            carousel.style.cursor = 'grab';
            handleSwipeGesture();
        }, { passive: true });

        function handleSwipeGesture() {
            const swipeThreshold = 50;
            const diff = touchStartX - touchEndX;

            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0) {
                    // Swipe left - next slide
                    if (typeof nextSlide === 'function') nextSlide();
                } else {
                    // Swipe right - previous slide
                    if (typeof previousSlide === 'function') previousSlide();
                }
            }
        }
    }

    // Prevent pull-to-refresh on specific elements
    function addPullToRefreshPrevention() {
        let lastTouchY = 0;
        let preventPullToRefresh = false;

        const preventElements = document.querySelectorAll('.modal-content');

        preventElements.forEach(element => {
            element.addEventListener('touchstart', function(e) {
                if (element.scrollTop === 0) {
                    lastTouchY = e.touches[0].clientY;
                    preventPullToRefresh = true;
                } else {
                    preventPullToRefresh = false;
                }
            }, { passive: true });

            element.addEventListener('touchmove', function(e) {
                const touchY = e.touches[0].clientY;
                const touchYDelta = touchY - lastTouchY;
                lastTouchY = touchY;

                if (preventPullToRefresh && touchYDelta > 0 && e.cancelable) {
                    e.preventDefault();
                }
            }, { passive: false });
        });
    }

    // Optimize viewport height for mobile browsers (especially iOS)
    function optimizeViewportHeight() {
        // Set CSS custom property for actual viewport height
        function setVH() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }

        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', setVH);
    }

    // Enhanced mobile menu with better animations
    function enhanceMobileMenu() {
        const menuButton = document.querySelector('button[aria-controls="mobileMenu"]');
        const mobileMenu = document.getElementById('mobileMenu');

        if (menuButton && mobileMenu) {
            menuButton.addEventListener('click', function() {
                const isExpanded = this.getAttribute('aria-expanded') === 'true';
                this.setAttribute('aria-expanded', !isExpanded);
            });
        }
    }

    // Add haptic feedback for iOS devices (if supported)
    function addHapticFeedback() {
        if (!isIOS || !window.navigator.vibrate) return;

        const buttons = document.querySelectorAll('button, a[role="button"]');
        
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                // Light haptic feedback
                window.navigator.vibrate(10);
            });
        });
    }

    // Improved modal handling for mobile
    function enhanceMobileModals() {
        const modals = document.querySelectorAll('[id$="Modal"]');
        
        modals.forEach(modal => {
            modal.addEventListener('touchmove', function(e) {
                const modalContent = this.querySelector('.modal-content');
                if (modalContent && !modalContent.contains(e.target) && e.cancelable) {
                    e.preventDefault();
                }
            }, { passive: false });
        });
    }

    // Optimize images for mobile
    function optimizeImagesForMobile() {
        if (window.innerWidth <= 768) {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                img.loading = 'lazy';
                img.decoding = 'async';
            });
        }
    }

    // Add loading indicators for slow connections
    function addLoadingIndicators() {
        if ('connection' in navigator) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            
            if (connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g')) {
                document.body.classList.add('slow-connection');
                
                // Reduce animation complexity
                const style = document.createElement('style');
                style.textContent = `
                    .slow-connection * {
                        animation-duration: 0.01ms !important;
                        transition-duration: 0.01ms !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }
    }

    // Enhanced FAQ toggle with better mobile UX
    function enhanceFAQMobile() {
        const originalToggleFAQ = window.toggleFAQ;
        
        window.toggleFAQ = function(id) {
            const button = document.querySelector(`button[aria-controls="faq-content-${id}"]`);
            const content = document.getElementById(`faq-content-${id}`);
            const icon = document.getElementById(`faq-icon-${id}`);
            
            if (button && content && icon) {
                const isExpanded = button.getAttribute('aria-expanded') === 'true';
                button.setAttribute('aria-expanded', !isExpanded);
                
                // Add haptic feedback on iOS
                if (isIOS && window.navigator.vibrate) {
                    window.navigator.vibrate(10);
                }
            }
            
            // Call original function if it exists
            if (originalToggleFAQ) {
                originalToggleFAQ(id);
            }
        };
    }

    // Performance monitoring for mobile
    function monitorMobilePerformance() {
        if ('PerformanceObserver' in window) {
            try {
                const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        // Only log very long tasks (>200ms) to reduce console spam
                        if (entry.duration > 200) {
                            console.warn('Long task detected:', entry.name, entry.duration.toFixed(2) + 'ms');
                        }
                    }
                });
                observer.observe({ entryTypes: ['measure', 'navigation'] });
            } catch (e) {
                // Performance Observer not fully supported
            }
        }
    }

    // Accessibility enhancements for mobile
    function enhanceMobileAccessibility() {
        // Add skip to main content link
        const skipLink = document.createElement('a');
        skipLink.href = '#how-it-works';
        skipLink.textContent = 'Skip to main content';
        skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-primary-900 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg';
        document.body.insertBefore(skipLink, document.body.firstChild);

        // Improve focus management for modals
        const modals = document.querySelectorAll('[id$="Modal"]');
        modals.forEach(modal => {
            modal.addEventListener('shown', function() {
                const firstFocusable = this.querySelector('button, a, input, select, textarea');
                if (firstFocusable) firstFocusable.focus();
            });
        });
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            initMobileEnhancements();
            enhanceMobileModals();
            optimizeImagesForMobile();
            addLoadingIndicators();
            enhanceFAQMobile();
            enhanceMobileAccessibility();
            
            if (window.innerWidth <= 768) {
                monitorMobilePerformance();
            }
        });
    } else {
        initMobileEnhancements();
        enhanceMobileModals();
        optimizeImagesForMobile();
        addLoadingIndicators();
        enhanceFAQMobile();
        enhanceMobileAccessibility();
        
        if (window.innerWidth <= 768) {
            monitorMobilePerformance();
        }
    }

    // Re-initialize on viewport resize
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            if (window.innerWidth <= 768) {
                initMobileEnhancements();
            }
        }, 250);
    });

    // Add service worker registration for better mobile performance (optional)
    if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
        window.addEventListener('load', function() {
            // Uncomment when service worker is implemented
            // navigator.serviceWorker.register('/sw.js').then(function(registration) {
            //     console.log('ServiceWorker registered:', registration);
            // }).catch(function(error) {
            //     console.log('ServiceWorker registration failed:', error);
            // });
        });
    }

    // Export for testing purposes
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            initMobileEnhancements,
            isMobile,
            isIOS,
            isAndroid
        };
    }

})();
