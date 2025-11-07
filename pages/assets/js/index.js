/**
 * Index Page Script
 * Q-Mak Queue Management System
 * Landing/Home Page functionality
 */

// ============================================================================
// COOP STATUS MANAGEMENT
// ============================================================================

// Store status data globally for modal
window.coopStatusData = null;

// Load COOP status on page load
async function loadCoopStatus() {
    try {
        const response = await fetch('/Q-Mak/php/api/student/get_schedule.php');
        const data = await response.json();
        
        if (data.success) {
            // Store status data globally
            window.coopStatusData = data;
            
            const status = data.current_status;
            const statusDisplay = document.getElementById('statusDisplay');
            
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
                document.getElementById('queueInfo').innerHTML = `
                    <i class="fas fa-users"></i> ${data.today_stats.pending_orders} orders in queue • Place yours now!
                `;
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
                document.getElementById('queueInfo').innerHTML = `
                    <i class="fas fa-moon"></i> Pre-order now for next business day delivery
                `;
            }
            
            // Update Today's Stats Card
            document.getElementById('totalOrders').textContent = data.today_stats.total_orders;
            document.getElementById('completedOrders').textContent = data.today_stats.completed_orders;
            document.getElementById('pendingOrders').textContent = data.today_stats.pending_orders;
            document.getElementById('avgWait').textContent = Math.round(data.today_stats.avg_estimated_wait || 10) + ' min';
            
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

// ============================================================================
// CAROUSEL FUNCTIONALITY
// ============================================================================

let currentSlide = 0;
const totalSlides = 2;

function updateCarousel() {
    const wrapper = document.getElementById('carouselWrapper');
    wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    // Update dots
    const dots = document.querySelectorAll('.carousel-dot');
    dots.forEach((dot, index) => {
        const circle = dot.querySelector('div');
        if (index === currentSlide) {
            circle.classList.remove('bg-gray-300', 'w-3', 'h-3');
            circle.classList.add('bg-gradient-to-br', 'from-blue-500', 'to-indigo-600', 'w-4', 'h-4');
        } else {
            circle.classList.remove('bg-gradient-to-br', 'from-blue-500', 'to-indigo-600', 'w-4', 'h-4');
            circle.classList.add('bg-gray-300', 'w-3', 'h-3');
        }
    });
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateCarousel();
}

function previousSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateCarousel();
}

function goToSlide(index) {
    currentSlide = index;
    updateCarousel();
}

// Auto-advance carousel every 8 seconds
let carouselInterval = setInterval(nextSlide, 8000);

// Pause auto-advance when hovering over carousel
document.getElementById('carouselWrapper').addEventListener('mouseenter', function() {
    clearInterval(carouselInterval);
});

document.getElementById('carouselWrapper').addEventListener('mouseleave', function() {
    carouselInterval = setInterval(nextSlide, 8000);
});
