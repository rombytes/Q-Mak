/**
 * Index Page Script
 * Q-Mak Queue Management System
 * Landing/Home Page functionality
 */

// Dynamic API base path - works on both localhost and production
const getApiBase = () => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base + '/php/api';
};

// ============================================================================
// COOP STATUS MANAGEMENT
// ============================================================================

// Store status data globally for modal
window.coopStatusData = null;

// Load COOP status on page load
async function loadCoopStatus() {
    try {
        const response = await fetch(`${getApiBase()}/student/get_schedule.php`);
        const data = await response.json();
        
        if (data.success) {
            // Store status data globally
            window.coopStatusData = data;
            
            const status = data.current_status;
            const statusDisplay = document.getElementById('statusDisplay');
            
            // Check if statusDisplay element exists
            if (!statusDisplay) {
                console.warn('statusDisplay element not found');
                return;
            }
            // Update Status Display Card
            if (status.open) {
                const timeLeft = formatTimeLeft(status.time_until_closing || (status.minutes_until_closing * 60));
                statusDisplay.innerHTML = `
                    <div class="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 shadow-md">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                            <span class="font-bold text-lg">OPEN</span>
                        </div>
                        <p class="text-green-100 text-sm">Open until ${formatTime(status.closes_at)}</p>
                        <div class="mt-3 pt-3 border-t border-green-400">
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-green-100">Closes in</span>
                                <span class="font-bold">${timeLeft.display}</span>
                            </div>
                        </div>
                    </div>
                    <div class="bg-blue-50 rounded-lg p-3 text-center">
                        <i class="fas fa-users text-blue-600 text-xl mb-1"></i>
                        <p class="text-2xl font-bold text-blue-900">${data.today_stats.pending_orders}</p>
                        <p class="text-xs text-gray-600">Currently in queue</p>
                    </div>
                `;
                
                // Update hero queue info
                const queueInfo = document.getElementById('queueInfo');
                if (queueInfo) {
                    queueInfo.innerHTML = `
                        <i class="fas fa-users"></i> ${data.today_stats.pending_orders} orders in queue • Place yours now!
                    `;
                }
            } else {
                const nextOpen = status.opens_at ? formatTime(status.opens_at) : 
                                status.reopens_at ? formatTime(status.reopens_at) : '';
                const isLunchBreak = status.reason === 'Lunch break';
                const bgColor = isLunchBreak ? 'from-orange-600 to-orange-700' : 'from-gray-600 to-gray-700';
                
                statusDisplay.innerHTML = `
                    <div class="bg-gradient-to-r ${bgColor} text-white rounded-xl p-4 shadow-md">
                        <div class="flex items-center gap-2 mb-2">
                            <div class="w-3 h-3 ${isLunchBreak ? 'bg-orange-400' : 'bg-gray-400'} rounded-full"></div>
                            <span class="font-bold text-lg">${isLunchBreak ? 'LUNCH BREAK' : 'CLOSED'}</span>
                        </div>
                        <p class="${isLunchBreak ? 'text-orange-100' : 'text-gray-200'} text-sm">${status.reason}</p>
                        ${nextOpen ? `
                            <div class="mt-3 pt-3 border-t ${isLunchBreak ? 'border-orange-500' : 'border-gray-500'}">
                                <div class="flex items-center justify-between text-sm">
                                    <span class="${isLunchBreak ? 'text-orange-200' : 'text-gray-300'}">${isLunchBreak ? 'Reopens at' : 'Opens at'}</span>
                                    <span class="font-bold">${nextOpen}</span>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                    <div class="bg-purple-50 rounded-lg p-3">
                        <div class="flex items-center gap-2 mb-2">
                            <i class="fas fa-moon text-purple-600"></i>
                            <span class="font-semibold text-purple-900">Pre-Orders Available</span>
                        </div>
                        <p class="text-xs text-purple-700">Orders placed now will be scheduled for the next business day</p>
                    </div>
                `;
                
                // Update hero queue info
                const queueInfo = document.getElementById('queueInfo');
                if (queueInfo) {
                    queueInfo.innerHTML = `
                        <i class="fas fa-moon"></i> Pre-order now for next business day delivery
                    `;
                }
            }
            
            // Update Today's Stats Card
            const totalOrders = document.getElementById('totalOrders');
            const completedOrders = document.getElementById('completedOrders');
            const pendingOrders = document.getElementById('pendingOrders');
            const avgWait = document.getElementById('avgWait');
            
            if (totalOrders) totalOrders.textContent = data.today_stats.total_orders;
            if (completedOrders) completedOrders.textContent = data.today_stats.completed_orders;
            if (pendingOrders) pendingOrders.textContent = data.today_stats.pending_orders;
            if (avgWait) avgWait.textContent = Math.round(data.today_stats.avg_estimated_wait || 10) + ' min';
            
            // Update Schedule Preview (next 3 days)
            if (data.schedule && data.schedule.length > 0) {
                const schedulePreview = document.getElementById('schedulePreview');
                const today = new Date().toISOString().split('T')[0];
                let scheduleHtml = '';
                
                data.schedule.slice(0, 3).forEach(day => {
                    if (!day) return;
                    const isToday = day.date === today;
                    const statusIcon = day.is_open ? 
                        '<i class="fas fa-check-circle text-green-500"></i>' : 
                        '<i class="fas fa-times-circle text-red-500"></i>';
                    
                    scheduleHtml += `
                        <div class="flex items-center justify-between py-2 ${isToday ? 'bg-blue-50 -mx-2 px-2 rounded-lg' : ''}">
                            <div class="flex items-center gap-2">
                                ${statusIcon}
                                <span class="${isToday ? 'font-bold text-blue-900' : 'text-gray-700'}">
                                    ${day.day_name || getDayName(new Date(day.date))}
                                    ${isToday ? '<span class="text-xs text-blue-600 ml-1">(Today)</span>' : ''}
                                </span>
                            </div>
                            <span class="text-xs ${day.is_open ? 'text-gray-600' : 'text-red-600'}">
                                ${day.is_open ? formatTime(day.opening_time) + '-' + formatTime(day.closing_time) : 'Closed'}
                            </span>
                        </div>
                    `;
                });
                
                schedulePreview.innerHTML = scheduleHtml;
            }
            // Recompute uniform heights after DOM updates
            setUniformCarouselHeight();
        }
    } catch (error) {
        console.error('Failed to load COOP status:', error);
        // Show default status
        document.getElementById('statusDisplay').innerHTML = `
            <div class="text-center text-gray-500 py-4">
                <i class="fas fa-wifi text-gray-400 text-2xl mb-2"></i>
                <p class="text-sm">Loading status...</p>
            </div>
        `;
    }
}

function getDayName(date) {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatTime(time) {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
}

function formatTimeLeft(seconds) {
    if (!seconds || seconds <= 0) {
        return { display: '0 min', hours: 0, minutes: 0 };
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let display = '';
    if (hours > 0) {
        display = `${hours} hr${hours > 1 ? 's' : ''} ${minutes} min${minutes !== 1 ? 's' : ''}`;
    } else {
        display = `${minutes} min${minutes !== 1 ? 's' : ''}`;
    }
    
    return { display, hours, minutes };
}

// Update modal COOP status
function updateModalCoopStatus() {
    const modalStatus = document.getElementById('modalCoopStatus');
    if (!modalStatus) return;
    
    // Use cached status data if available
    if (window.coopStatusData) {
        const status = window.coopStatusData.current_status;
        if (status.open) {
            modalStatus.className = 'mb-4 p-3 rounded-lg text-sm bg-green-50 border border-green-200';
            modalStatus.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span class="font-semibold text-green-800">COOP is OPEN</span>
                    <span class="text-green-600">• Closes at ${formatTime(status.closes_at)}</span>
                </div>
            `;
        } else {
            modalStatus.className = 'mb-4 p-3 rounded-lg text-sm bg-purple-50 border border-purple-200';
            modalStatus.innerHTML = `
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span class="font-semibold text-purple-800">Pre-Orders Available</span>
                    <span class="text-purple-600">• Next business day delivery</span>
                </div>
            `;
        }
    }
}

// Load status on page load
document.addEventListener('DOMContentLoaded', () => {
    loadCoopStatus();
});

// Auto-refresh every minute
setInterval(loadCoopStatus, 60000);

// ============================================================================
// MODAL MANAGEMENT
// ============================================================================

// Modal show functions
function showLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Prevent background scroll
}

function hideLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scroll
}

function showOrderModal() {
    const modal = document.getElementById('orderModal');
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    updateModalCoopStatus();
}

function hideOrderModal() {
    const modal = document.getElementById('orderModal');
    modal.classList.add('hidden');
    document.body.style.overflow = '';
}

// Close modal when clicking backdrop
function closeModalOnBackdrop(event, modalId) {
    if (event.target.id === modalId) {
        if (modalId === 'loginModal') {
            hideLoginModal();
        } else if (modalId === 'orderModal') {
            hideOrderModal();
        }
    }
}

// ESC key to close modals
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        hideLoginModal();
        hideOrderModal();
    }
});

// ============================================================================
// SCROLL & NAVIGATION
// ============================================================================

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Fade-in animation on scroll (lazy-loaded)
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animationDelay = '0.2s';
            entry.target.classList.add('animate-fade-in');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Observe sections for fade-in
document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('#about > div, #contact > div > div');
    sections.forEach(section => {
        observer.observe(section);
    });
});

// Uniform height across all carousel slides (all viewports)
function setUniformCarouselHeight() {
    const wrapper = document.getElementById('carouselWrapper');
    if (!wrapper) return;
    const slides = Array.from(wrapper.children || []);
    if (slides.length === 0) return;

    // Reset previous min-heights to measure natural heights
    slides.forEach((s) => { s.style.minHeight = ''; });

    // Compute tallest slide
    const maxH = slides.reduce((m, s) => {
        const h = Math.ceil(s.getBoundingClientRect().height);
        return h > m ? h : m;
    }, 0);
    if (!maxH || !isFinite(maxH)) return;

    // Apply uniform min-height
    slides.forEach((s) => { s.style.minHeight = maxH + 'px'; });
}

// ============================================================================
// CAROUSEL FUNCTIONALITY
// ============================================================================

let currentSlide = 0;
const totalSlides = 2; // We have 2 slides

function updateCarousel() {
    const wrapper = document.getElementById('carouselWrapper');
    if (!wrapper) {
        console.error('carouselWrapper not found');
        return;
    }
    // Calculate slide width robustly: prefer first slide width, fallback to container width
    const container = wrapper.parentElement;
    const containerWidth = container ? Math.round(container.getBoundingClientRect().width) : Math.round(window.innerWidth);
    const firstSlide = wrapper.children && wrapper.children[0];
    const slideWidth = Math.round(firstSlide?.getBoundingClientRect().width || containerWidth);
    wrapper.style.transform = `translateX(-${currentSlide * slideWidth}px)`;

    // Update dots indicator
    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, index) => {
        const circle = dot.querySelector('div');
        if (!circle) return;

        // Remove all active classes
        circle.classList.remove('bg-gradient-to-br', 'from-accent-500', 'to-accent-600', 'ring-2', 'ring-accent-200');
        // Add inactive class
        circle.classList.add('bg-gray-300');
        
        // Apply active state if it's the current slide
        if (index === currentSlide) {
            circle.classList.remove('bg-gray-300'); // Remove inactive class
            circle.classList.add('bg-gradient-to-br', 'from-accent-500', 'to-accent-600', 'ring-2', 'ring-accent-200');
        }
    });
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateCarousel();
    if (currentSlide === 1) {
        loadCoopStatus(); // Load status when switching to COOP Dashboard slide
    }
}

function previousSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateCarousel();
    if (currentSlide === 1) {
        loadCoopStatus(); // Load status when switching to COOP Dashboard slide
    }
}

function goToSlide(index) {
    if (index >= 0 && index < totalSlides) {
        currentSlide = index;
        updateCarousel();
        if (currentSlide === 1) {
            loadCoopStatus(); // Load status when switching to COOP Dashboard slide
        }
    }
}

function initializeCarousel() {
    const carouselWrapper = document.getElementById('carouselWrapper');
    if (!carouselWrapper) {
        console.warn('Carousel wrapper not found, skipping initialization.');
        return;
    }

    // Set initial state
    updateCarousel();
    setUniformCarouselHeight();

    // Explicitly load COOP status if the second slide is initially active (should be currentSlide = 0 on load)
    if (currentSlide === 1) {
        loadCoopStatus();
    }

    // Auto-advance carousel
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const intervalMs = isMobile ? 12000 : 8000;
    let carouselInterval = setInterval(nextSlide, intervalMs);
    let resumeTimeout;

    // Pause on hover
    carouselWrapper.addEventListener('mouseenter', () => {
        clearInterval(carouselInterval);
        if (resumeTimeout) clearTimeout(resumeTimeout);
    });
    carouselWrapper.addEventListener('mouseleave', () => {
        if (resumeTimeout) clearTimeout(resumeTimeout);
        const isMobileNow = window.matchMedia('(max-width: 768px)').matches;
        const ms = isMobileNow ? 12000 : 8000;
        carouselInterval = setInterval(nextSlide, ms);
    });

    // Add touch event listeners for swipe functionality
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let isMoving = false;
    let lastTouchX = 0;

    carouselWrapper.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        lastTouchX = touchStartX;
        isMoving = true;
        // pause auto-advance on touch and resume after idle
        clearInterval(carouselInterval);
        if (resumeTimeout) clearTimeout(resumeTimeout);
        resumeTimeout = setTimeout(() => {
            const isMobileNow = window.matchMedia('(max-width: 768px)').matches;
            const ms = isMobileNow ? 12000 : 8000;
            carouselInterval = setInterval(nextSlide, ms);
        }, 10000);
    });
    
    carouselWrapper.addEventListener('touchmove', (e) => {
        if (!isMoving) return;
        
        touchEndX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        // Calculate distances
        const dx = Math.abs(touchEndX - touchStartX);
        const dy = Math.abs(touchY - touchStartY);
        
        // Prevent vertical scrolling only when horizontal movement is detected
        if (dx > 15 && dx > dy && e.cancelable) {
            e.preventDefault();
        }
        lastTouchX = touchEndX;
    }, { passive: false });

    carouselWrapper.addEventListener('touchend', () => {
        if (!isMoving) return;
        isMoving = false;
        
        const swipeDistance = touchStartX - touchEndX;
        const swipeThreshold = 50; // Minimum swipe distance
        
        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) { // Swiped left
                nextSlide();
            } else { // Swiped right
                previousSlide();
            }
        }
    });

    // Recalculate carousel translate when viewport changes
    window.addEventListener('resize', () => {
        // Small debounce to avoid layout thrash
        clearTimeout(window._qmak_carousel_resize);
        window._qmak_carousel_resize = setTimeout(() => {
            updateCarousel();
            setUniformCarouselHeight();
        }, 120);
    });
}

// ============================================================================
// FAQ FUNCTIONALITY
// ============================================================================

function toggleFAQ(number) {
    const content = document.getElementById(`faq-content-${number}`);
    const icon = document.getElementById(`faq-icon-${number}`);
    
    if (content && icon) {
        content.classList.toggle('hidden');
        icon.classList.toggle('rotate-180');
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    loadCoopStatus();
    
    // Auto-refresh status every 5 minutes
    setInterval(loadCoopStatus, 5 * 60 * 1000);
    
    // Initialize carousel
    initializeCarousel();
    
    // Initialize FAQ toggle functionality
    const faqToggles = document.querySelectorAll('.faq-toggle');
    faqToggles.forEach((toggle, index) => {
        toggle.addEventListener('click', function() {
            toggleFAQ(index + 1);
        });
    });
});

// ============================================================================
// ANIMATED COUNTER
// ============================================================================

function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16); // 60fps
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString();
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 16);
}

// Initialize counters when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Animate statistics counters
    const counters = document.querySelectorAll('[data-counter]');
    
    // Use Intersection Observer to trigger animation when visible
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                entry.target.classList.add('animated');
                const target = parseInt(entry.target.getAttribute('data-counter'));
                animateCounter(entry.target, target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
});

// ============================================================================
// MOBILE MENU FUNCTIONALITY
// ============================================================================

function toggleMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const icon = document.getElementById('menuIcon');
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        menu.classList.add('animate-fade-in');
        icon.classList.remove('bi-list');
        icon.classList.add('bi-x');
    } else {
        menu.classList.add('hidden');
        icon.classList.remove('bi-x');
        icon.classList.add('bi-list');
    }
}

function closeMobileMenu() {
    const menu = document.getElementById('mobileMenu');
    const icon = document.getElementById('menuIcon');
    
    menu.classList.add('hidden');
    icon.classList.remove('bi-x');
    icon.classList.add('bi-list');
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById('mobileMenu');
    const menuButton = event.target.closest('button[onclick="toggleMobileMenu()"]');
    const menuContent = document.getElementById('mobileMenu');
    
    if (!menuButton && !menuContent?.contains(event.target) && !menu?.classList.contains('hidden')) {
        closeMobileMenu();
    }
});

// ============================================================================
// FAQ SEARCH FUNCTIONALITY
// ============================================================================

function searchFAQs() {
    const searchInput = document.getElementById('faqSearch');
    const searchTerm = searchInput.value.toLowerCase();
    const faqList = document.getElementById('faqList');
    const faqItems = faqList.querySelectorAll('.bg-white');
    
    let visibleCount = 0;
    
    faqItems.forEach(item => {
        const question = item.querySelector('button span').textContent.toLowerCase();
        const answer = item.querySelector('[id^="faq-content-"]')?.textContent.toLowerCase() || '';
        
        if (question.includes(searchTerm) || answer.includes(searchTerm)) {
            item.style.display = '';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Show "no results" message if needed
    let noResults = document.getElementById('noResultsMessage');
    if (visibleCount === 0 && searchTerm !== '') {
        if (!noResults) {
            noResults = document.createElement('div');
            noResults.id = 'noResultsMessage';
            noResults.className = 'text-center py-12';
            noResults.innerHTML = `
                <i class="bi bi-search text-gray-300 text-5xl mb-3"></i>
                <p class="text-gray-500 text-lg">No FAQs found matching your search.</p>
                <p class="text-gray-400 text-sm mt-2">Try different keywords or <a href="#contact" class="text-accent-600 hover:underline">contact us</a> directly.</p>
            `;
            faqList.appendChild(noResults);
        }
    } else if (noResults) {
        noResults.remove();
    }
}

