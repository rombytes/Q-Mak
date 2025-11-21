/**
 * Q-MAK UI Utilities Library
 * Enhanced interactions, animations, and real-time updates
 * Phase 1: Critical UX Improvements
 */

// ========== ANIMATION UTILITIES ==========

const UIAnimations = {
    /**
     * Fade in an element
     * @param {HTMLElement} element - Element to animate
     * @param {number} duration - Animation duration in ms
     * @param {function} callback - Optional callback after animation
     */
    fadeIn(element, duration = 300, callback = null) {
        if (!element) return;
        
        element.style.opacity = '0';
        element.style.display = 'block';
        
        requestAnimationFrame(() => {
            element.style.transition = `opacity ${duration}ms ease`;
            element.style.opacity = '1';
            
            if (callback) {
                setTimeout(callback, duration);
            }
        });
    },

    /**
     * Fade out an element
     */
    fadeOut(element, duration = 300, callback = null) {
        if (!element) return;
        
        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '0';
        
        setTimeout(() => {
            element.style.display = 'none';
            if (callback) callback();
        }, duration);
    },

    /**
     * Slide down (expand) an element
     */
    slideDown(element, duration = 300) {
        if (!element) return;
        
        element.style.height = '0';
        element.style.overflow = 'hidden';
        element.style.display = 'block';
        
        const height = element.scrollHeight;
        
        requestAnimationFrame(() => {
            element.style.transition = `height ${duration}ms ease`;
            element.style.height = height + 'px';
            
            setTimeout(() => {
                element.style.height = '';
                element.style.overflow = '';
            }, duration);
        });
    },

    /**
     * Slide up (collapse) an element
     */
    slideUp(element, duration = 300, callback = null) {
        if (!element) return;
        
        const height = element.scrollHeight;
        element.style.height = height + 'px';
        element.style.overflow = 'hidden';
        
        requestAnimationFrame(() => {
            element.style.transition = `height ${duration}ms ease`;
            element.style.height = '0';
            
            setTimeout(() => {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
                if (callback) callback();
            }, duration);
        });
    },

    /**
     * Scroll to element smoothly
     */
    scrollTo(element, offset = 0) {
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
};

// ========== LOADING STATES ==========

const LoadingStates = {
    /**
     * Show loading spinner on button
     */
    showButtonLoading(button, originalText = null) {
        if (!button) return;
        
        button.disabled = true;
        button.dataset.originalText = originalText || button.innerHTML;
        button.innerHTML = `
            <div class="loader-spinner loader-spinner--sm"></div>
            <span class="ml-2">Loading...</span>
        `;
    },

    /**
     * Hide loading spinner on button
     */
    hideButtonLoading(button, successText = null) {
        if (!button) return;
        
        button.disabled = false;
        const originalText = button.dataset.originalText;
        button.innerHTML = successText || originalText || 'Submit';
    },

    /**
     * Show skeleton screen
     */
    showSkeleton(container) {
        if (!container) return;
        
        const skeletonHTML = `
            <div class="space-y-4">
                <div class="skeleton skeleton--title"></div>
                <div class="skeleton skeleton--text"></div>
                <div class="skeleton skeleton--text"></div>
                <div class="skeleton skeleton--card"></div>
            </div>
        `;
        container.innerHTML = skeletonHTML;
    },

    /**
     * Create custom skeleton
     */
    createSkeleton(type = 'text') {
        const div = document.createElement('div');
        div.className = `skeleton skeleton--${type}`;
        return div;
    }
};

// ========== TOAST NOTIFICATIONS ==========

const Toast = {
    container: null,

    /**
     * Initialize toast container
     */
    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 12px;
            `;
            document.body.appendChild(this.container);
        }
    },

    /**
     * Show toast notification
     */
    show(message, type = 'info', duration = 3000) {
        this.init();

        const toast = document.createElement('div');
        toast.className = `toast toast--${type} animate-fadeInDown`;
        
        const icons = {
            success: 'bi-check-circle-fill',
            error: 'bi-x-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };

        const colors = {
            success: 'var(--success-600)',
            error: 'var(--danger-600)',
            warning: 'var(--warning-600)',
            info: 'var(--info-600)'
        };

        toast.innerHTML = `
            <i class="bi ${icons[type]}" style="color: ${colors[type]}; font-size: 1.5rem;"></i>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 2px;">${this.getTitle(type)}</div>
                <div style="font-size: 0.875rem; color: var(--primary-600);">${message}</div>
            </div>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; color: var(--primary-400); font-size: 1.25rem;">
                <i class="bi bi-x"></i>
            </button>
        `;

        this.container.appendChild(toast);

        // Auto remove
        if (duration > 0) {
            setTimeout(() => {
                toast.classList.add('toast--exit');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        return toast;
    },

    getTitle(type) {
        const titles = {
            success: 'Success!',
            error: 'Error!',
            warning: 'Warning!',
            info: 'Info'
        };
        return titles[type] || 'Notification';
    },

    success(message, duration) {
        return this.show(message, 'success', duration);
    },

    error(message, duration) {
        return this.show(message, 'error', duration);
    },

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    },

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
};

// ========== CONFETTI ANIMATION ==========

const Confetti = {
    /**
     * Trigger confetti animation
     */
    trigger(duration = 3000) {
        const colors = ['#2563eb', '#f97316', '#10b981', '#f59e0b', '#ef4444'];
        const confettiCount = 50;
        
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        `;
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                background-color: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}%;
                top: -10px;
                opacity: ${Math.random() * 0.5 + 0.5};
                animation: confetti-fall ${2 + Math.random() * 2}s linear forwards;
                animation-delay: ${Math.random() * 0.5}s;
            `;
            container.appendChild(confetti);
        }
        
        document.body.appendChild(container);
        
        setTimeout(() => {
            container.remove();
        }, duration);
    }
};

// ========== RIPPLE EFFECT ==========

const RippleEffect = {
    /**
     * Add ripple effect to an element
     */
    add(element) {
        if (!element) return;
        
        element.classList.add('btn-ripple');
        
        element.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            ripple.classList.add('ripple-effect');
            
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    },

    /**
     * Add ripple to multiple elements
     */
    addToAll(selector) {
        document.querySelectorAll(selector).forEach(el => this.add(el));
    }
};

// ========== MODAL UTILITIES ==========

const Modal = {
    /**
     * Create and show modal
     */
    show(content, options = {}) {
        const {
            title = '',
            size = 'medium',
            closeButton = true,
            backdrop = true,
            onClose = null
        } = options;

        // Create backdrop
        if (backdrop) {
            const backdropEl = document.createElement('div');
            backdropEl.className = 'modal-backdrop';
            backdropEl.id = 'modal-backdrop';
            backdropEl.addEventListener('click', () => this.close(onClose));
            document.body.appendChild(backdropEl);
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'modal-content';
        modal.id = 'dynamic-modal';
        
        const sizeClasses = {
            small: 'max-w-md',
            medium: 'max-w-2xl',
            large: 'max-w-4xl',
            full: 'max-w-6xl'
        };
        
        modal.classList.add(sizeClasses[size] || sizeClasses.medium);
        
        modal.innerHTML = `
            ${title ? `
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--gray-200); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: var(--primary-900);">${title}</h3>
                    ${closeButton ? `
                        <button onclick="Modal.close()" style="background: none; border: none; cursor: pointer; color: var(--primary-400); font-size: 1.5rem;">
                            <i class="bi bi-x"></i>
                        </button>
                    ` : ''}
                </div>
            ` : ''}
            <div style="padding: 1.5rem;">
                ${content}
            </div>
        `;

        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        return modal;
    },

    /**
     * Close modal
     */
    close(callback = null) {
        const modal = document.getElementById('dynamic-modal');
        const backdrop = document.getElementById('modal-backdrop');

        if (modal) {
            modal.style.animation = 'scaleOut 0.2s ease-out';
            setTimeout(() => modal.remove(), 200);
        }

        if (backdrop) {
            backdrop.style.animation = 'fadeOut 0.2s ease-out';
            setTimeout(() => backdrop.remove(), 200);
        }

        document.body.style.overflow = '';

        if (callback) callback();
    }
};

// ========== FORM VALIDATION FEEDBACK ==========

const FormValidation = {
    /**
     * Show input error
     */
    showError(input, message) {
        if (!input) return;

        input.classList.add('border-danger-500', 'animate-shake');
        
        // Remove existing error message
        const existingError = input.parentElement.querySelector('.error-message');
        if (existingError) existingError.remove();

        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message text-danger-600 text-sm mt-1 animate-fadeIn';
        errorDiv.innerHTML = `<i class="bi bi-exclamation-circle mr-1"></i>${message}`;
        input.parentElement.appendChild(errorDiv);

        setTimeout(() => {
            input.classList.remove('animate-shake');
        }, 500);
    },

    /**
     * Clear input error
     */
    clearError(input) {
        if (!input) return;

        input.classList.remove('border-danger-500');
        
        const errorMessage = input.parentElement.querySelector('.error-message');
        if (errorMessage) errorMessage.remove();
    },

    /**
     * Show success
     */
    showSuccess(input) {
        if (!input) return;

        input.classList.add('border-success-500');
        
        setTimeout(() => {
            input.classList.remove('border-success-500');
        }, 2000);
    }
};

// ========== DEBOUNCE UTILITY ==========

function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========== THROTTLE UTILITY ==========

function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ========== REAL-TIME UPDATES ==========

const RealTimeUpdater = {
    intervals: {},

    /**
     * Start polling for updates
     */
    start(key, callback, interval = 30000) {
        if (this.intervals[key]) {
            this.stop(key);
        }

        // Execute immediately
        callback();

        // Then set interval
        this.intervals[key] = setInterval(callback, interval);
    },

    /**
     * Stop polling
     */
    stop(key) {
        if (this.intervals[key]) {
            clearInterval(this.intervals[key]);
            delete this.intervals[key];
        }
    },

    /**
     * Stop all polling
     */
    stopAll() {
        Object.keys(this.intervals).forEach(key => this.stop(key));
    }
};

// ========== INTERSECTION OBSERVER (Scroll Animations) ==========

const ScrollAnimations = {
    observer: null,

    /**
     * Initialize scroll animations
     */
    init(selector = '.animate-on-scroll') {
        if (!('IntersectionObserver' in window)) {
            // Fallback for browsers without IntersectionObserver
            document.querySelectorAll(selector).forEach(el => {
                el.classList.add('animate-fadeInUp');
            });
            return;
        }

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fadeInUp');
                    this.observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        document.querySelectorAll(selector).forEach(el => {
            this.observer.observe(el);
        });
    }
};

// ========== PROGRESS BAR ==========

const ProgressBar = {
    /**
     * Create progress bar
     */
    create(container, initialValue = 0) {
        if (!container) return null;

        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = `<div class="progress-bar__fill" style="width: ${initialValue}%"></div>`;
        
        container.appendChild(progressBar);

        return {
            element: progressBar,
            update(value) {
                const fill = progressBar.querySelector('.progress-bar__fill');
                fill.style.width = `${Math.min(100, Math.max(0, value))}%`;
            },
            setIndeterminate(isIndeterminate) {
                if (isIndeterminate) {
                    progressBar.classList.add('progress-bar--indeterminate');
                } else {
                    progressBar.classList.remove('progress-bar--indeterminate');
                }
            }
        };
    }
};

// ========== COPY TO CLIPBOARD ==========

const Clipboard = {
    /**
     * Copy text to clipboard
     */
    async copy(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                Toast.success('Copied to clipboard!');
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                document.body.appendChild(textArea);
                textArea.select();
                const success = document.execCommand('copy');
                textArea.remove();
                
                if (success) {
                    Toast.success('Copied to clipboard!');
                }
                return success;
            }
        } catch (err) {
            Toast.error('Failed to copy to clipboard');
            return false;
        }
    }
};

// ========== INITIALIZE ON DOM READY ==========

document.addEventListener('DOMContentLoaded', () => {
    // Initialize scroll animations
    ScrollAnimations.init();

    // Add ripple effect to buttons
    RippleEffect.addToAll('.btn-primary, .btn-success, .btn-warning');

    // Add focus ring to interactive elements
    document.querySelectorAll('button, a, input, select, textarea').forEach(el => {
        if (!el.classList.contains('focus-ring') && !el.classList.contains('no-focus-ring')) {
            el.classList.add('focus-ring');
        }
    });
});

// ========== EXPORT FOR GLOBAL USE ==========

window.UIAnimations = UIAnimations;
window.LoadingStates = LoadingStates;
window.Toast = Toast;
window.Confetti = Confetti;
window.RippleEffect = RippleEffect;
window.Modal = Modal;
window.FormValidation = FormValidation;
window.debounce = debounce;
window.throttle = throttle;
window.RealTimeUpdater = RealTimeUpdater;
window.ScrollAnimations = ScrollAnimations;
window.ProgressBar = ProgressBar;
window.Clipboard = Clipboard;
