/**
 * Keyboard Shortcuts System
 * Provides keyboard navigation and shortcuts for enhanced accessibility
 */

class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.isEnabled = true;
        this.modifierKeys = {
            ctrl: false,
            alt: false,
            shift: false,
            meta: false
        };
        
        this.init();
    }
    
    init() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Register default shortcuts
        this.registerDefaultShortcuts();
        
        // Add keyboard navigation class
        document.body.classList.add('keyboard-nav-enabled');
    }
    
    registerDefaultShortcuts() {
        // Navigation shortcuts
        this.register('/', () => this.focusSearch());
        this.register('Escape', () => this.closeModals());
        this.register('?', () => this.showHelp());
        
        // Admin dashboard shortcuts (if on admin page)
        if (window.location.pathname.includes('admin')) {
            this.register('ctrl+1', () => this.switchTab('queue-management'));
            this.register('ctrl+2', () => this.switchTab('queue-history'));
            this.register('ctrl+3', () => this.switchTab('analytics'));
            this.register('ctrl+4', () => this.switchTab('student-records'));
            this.register('ctrl+5', () => this.switchTab('settings'));
            this.register('ctrl+r', () => this.refreshData());
        }
        
        // Student shortcuts
        if (window.location.pathname.includes('student')) {
            this.register('ctrl+o', () => this.quickOrder());
            this.register('ctrl+s', () => this.checkStatus());
        }
    }
    
    register(shortcut, callback, description = '') {
        const key = this.normalizeShortcut(shortcut);
        this.shortcuts.set(key, { callback, description });
    }
    
    unregister(shortcut) {
        const key = this.normalizeShortcut(shortcut);
        this.shortcuts.delete(key);
    }
    
    normalizeShortcut(shortcut) {
        return shortcut.toLowerCase().replace(/\s+/g, '');
    }
    
    handleKeyDown(e) {
        if (!this.isEnabled) return;
        
        // Update modifier key states
        this.modifierKeys.ctrl = e.ctrlKey;
        this.modifierKeys.alt = e.altKey;
        this.modifierKeys.shift = e.shiftKey;
        this.modifierKeys.meta = e.metaKey;
        
        // Skip if user is typing in an input field
        if (this.isTypingInInput(e.target)) return;
        
        const shortcut = this.buildShortcutString(e);
        const command = this.shortcuts.get(shortcut);
        
        if (command) {
            e.preventDefault();
            command.callback(e);
        }
    }
    
    handleKeyUp(e) {
        // Update modifier key states
        this.modifierKeys.ctrl = e.ctrlKey;
        this.modifierKeys.alt = e.altKey;
        this.modifierKeys.shift = e.shiftKey;
        this.modifierKeys.meta = e.metaKey;
    }
    
    buildShortcutString(e) {
        let shortcut = '';
        
        if (e.ctrlKey) shortcut += 'ctrl+';
        if (e.altKey) shortcut += 'alt+';
        if (e.shiftKey && e.key.length > 1) shortcut += 'shift+';
        if (e.metaKey) shortcut += 'meta+';
        
        shortcut += e.key.toLowerCase();
        
        return shortcut;
    }
    
    isTypingInInput(element) {
        const tagName = element.tagName.toLowerCase();
        const inputTypes = ['input', 'textarea', 'select'];
        const isContentEditable = element.contentEditable === 'true';
        
        return inputTypes.includes(tagName) || isContentEditable;
    }
    
    // Default shortcut actions
    focusSearch() {
        const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="search" i], input[placeholder*="Search"]');
        if (searchInputs.length > 0) {
            searchInputs[0].focus();
        }
    }
    
    closeModals() {
        // Close any open modals
        const modals = document.querySelectorAll('.modal, [role="dialog"]');
        modals.forEach(modal => {
            if (modal.style.display !== 'none' && !modal.classList.contains('hidden')) {
                const closeBtn = modal.querySelector('.close, [data-dismiss="modal"], .modal-close');
                if (closeBtn) {
                    closeBtn.click();
                } else {
                    modal.style.display = 'none';
                    modal.classList.add('hidden');
                }
            }
        });
        
        // Close dropdowns
        const dropdowns = document.querySelectorAll('.dropdown-menu:not(.hidden)');
        dropdowns.forEach(dropdown => {
            dropdown.classList.add('hidden');
        });
    }
    
    showHelp() {
        const helpModal = document.getElementById('helpModal');
        if (helpModal) {
            helpModal.classList.remove('hidden');
        } else {
            this.createHelpModal();
        }
    }
    
    switchTab(tabName) {
        if (typeof showTab === 'function') {
            showTab(tabName);
        }
    }
    
    refreshData() {
        if (typeof fetchOrders === 'function') {
            fetchOrders();
        }
        if (typeof fetchStudents === 'function') {
            fetchStudents();
        }
    }
    
    quickOrder() {
        if (typeof showOrderModal === 'function') {
            showOrderModal();
        }
    }
    
    checkStatus() {
        if (typeof showStatusModal === 'function') {
            showStatusModal();
        }
    }
    
    createHelpModal() {
        const shortcuts = Array.from(this.shortcuts.entries())
            .filter(([key, command]) => command.description)
            .map(([key, command]) => `<div class="flex justify-between py-2"><kbd class="px-2 py-1 bg-gray-200 rounded text-sm">${key}</kbd><span>${command.description}</span></div>`)
            .join('');
        
        const modal = document.createElement('div');
        modal.id = 'helpModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Keyboard Shortcuts</h3>
                    <button onclick="this.closest('.modal').remove()" class="text-gray-500 hover:text-gray-700">
                        <i class="bi bi-x-lg"></i>
                    </button>
                </div>
                <div class="space-y-2">
                    ${shortcuts || '<p class="text-gray-500">No shortcuts available</p>'}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    enable() {
        this.isEnabled = true;
    }
    
    disable() {
        this.isEnabled = false;
    }
    
    getShortcuts() {
        return Array.from(this.shortcuts.entries());
    }
}

// Initialize keyboard shortcuts when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.keyboardShortcuts = new KeyboardShortcuts();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KeyboardShortcuts;
}
