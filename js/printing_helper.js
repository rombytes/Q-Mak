/**
 * Printing Service Helper Functions
 * Handles file uploads, price calculations, and printing-specific logic
 * Version: 1.0.0
 */

// Use global API_BASE if available, otherwise create getApiBase function
function getApiBase() {
    if (typeof API_BASE !== 'undefined') return API_BASE;
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base ? base + '/php/api' : '../../php/api';
}

// Printing prices (will be loaded from settings)
let printingPrices = {
    'B&W': {
        'Short': 1.00,
        'Long': 1.50,
        'A4': 1.25
    },
    'Colored': {
        'Short': 5.00,
        'Long': 7.50,
        'A4': 6.00
    }
};

// File upload constraints
const MAX_FILE_SIZE = 10485760; // 10MB
const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];

/**
 * Count pages in a file
 * - PDFs: Uses pdf.js to get exact page count
 * - Images: Returns 1
 * - Word/Excel: Returns null (manual entry needed)
 * @param {File} file - The file to count pages for
 * @returns {Promise<number|null>} Page count or null if cannot be determined
 */
async function countFilePages(file) {
    if (!file) return null;
    
    const fileType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop();
    
    // Images always count as 1 page
    if (fileType.startsWith('image/') || ['jpg', 'jpeg', 'png'].includes(extension)) {
        return 1;
    }
    
    // PDFs - use pdf.js to get exact page count
    if (fileType === 'application/pdf' || extension === 'pdf') {
        try {
            // Check if pdfjsLib is available
            if (typeof pdfjsLib === 'undefined') {
                console.warn('PDF.js library not loaded');
                return null;
            }
            
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            return pdf.numPages;
        } catch (error) {
            console.error('Error counting PDF pages:', error);
            return null;
        }
    }
    
    // Word/Excel documents - cannot determine page count automatically
    if (['doc', 'docx', 'xls', 'xlsx'].includes(extension)) {
        return null;
    }
    
    return null;
}

/**
 * Load printing prices from settings
 */
async function loadPrintingPrices() {
    try {
        const response = await fetch(`${getApiBase()}/get_printing_prices.php`);
        
        if (!response.ok) {
            console.warn('Failed to load printing prices (HTTP ' + response.status + '), using defaults');
            return;
        }
        
        const text = await response.text();
        if (!text) {
            console.warn('Empty response from printing prices API, using defaults');
            return;
        }
        
        const data = JSON.parse(text);
        
        if (data.success && data.prices) {
            printingPrices = data.prices;
            console.log('Successfully loaded printing prices from server');
        } else if (data.prices) {
            // Even if success is false, use prices if provided (fallback case)
            printingPrices = data.prices;
            console.log('Using fallback printing prices from server');
        }
    } catch (error) {
        console.warn('Error loading printing prices, using defaults:', error.message);
        // Keep default prices that are already set
    }
}

/**
 * Validate uploaded file
 */
function validatePrintFile(file) {
    if (!file) {
        return { valid: false, message: 'Please select a file to upload' };
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        const maxSizeMB = (MAX_FILE_SIZE / 1048576).toFixed(1);
        return { 
            valid: false, 
            message: `File size exceeds ${maxSizeMB}MB limit` 
        };
    }
    
    // Check file extension
    const fileName = file.name.toLowerCase();
    const extension = fileName.split('.').pop();
    
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
        return { 
            valid: false, 
            message: `Only ${ALLOWED_EXTENSIONS.join(', ').toUpperCase()} files are allowed` 
        };
    }
    
    return { valid: true };
}

/**
 * Calculate printing price estimate
 */
function calculatePrintingPrice(pageCount, colorMode, paperSize, copies, doubleSided) {
    if (!pageCount || pageCount <= 0) {
        return 0;
    }
    
    // Get base price per page
    const pricePerPage = printingPrices[colorMode]?.[paperSize] || 0;
    
    // Calculate total pages (double-sided reduces page count)
    let effectivePages = pageCount;
    if (doubleSided) {
        effectivePages = Math.ceil(pageCount / 2);
    }
    
    // Calculate total price
    const totalPrice = pricePerPage * effectivePages * copies;
    
    return totalPrice;
}

/**
 * Update price display in real-time
 */
function updatePrintingPriceDisplay() {
    const pageCount = parseInt(document.getElementById('pageCount')?.value) || 0;
    const colorMode = document.getElementById('colorMode')?.value || 'B&W';
    const paperSize = document.getElementById('paperSize')?.value || 'A4';
    const copies = parseInt(document.getElementById('copies')?.value) || 1;
    const doubleSided = document.getElementById('doubleSided')?.checked || false;
    
    const price = calculatePrintingPrice(pageCount, colorMode, paperSize, copies, doubleSided);
    
    const priceElement = document.getElementById('estimatedPrice');
    if (priceElement) {
        priceElement.textContent = `₱${price.toFixed(2)}`;
    }
    
    return price;
}

/**
 * Handle file input change with auto page count detection
 */
async function handlePrintFileChange(event) {
    const file = event.target.files[0];
    const feedbackElement = document.getElementById('fileFeedback');
    const pageCountInput = document.getElementById('pageCount');
    
    if (!file) {
        if (feedbackElement) {
            feedbackElement.innerHTML = '';
            feedbackElement.classList.add('hidden');
        }
        return;
    }
    
    const validation = validatePrintFile(file);
    
    if (!validation.valid) {
        if (feedbackElement) {
            feedbackElement.innerHTML = `
                <div class="flex items-center gap-2 text-red-600">
                    <i class="bi bi-exclamation-circle-fill"></i>
                    <span>${validation.message}</span>
                </div>
            `;
            feedbackElement.classList.remove('hidden');
        }
        event.target.value = '';
        return;
    }
    
    // Show loading state while detecting page count
    const fileSizeMB = (file.size / 1048576).toFixed(2);
    if (feedbackElement) {
        feedbackElement.innerHTML = `
            <div class="flex items-center gap-2 text-blue-600">
                <i class="bi bi-hourglass-split animate-spin"></i>
                <span><strong>${file.name}</strong> (${fileSizeMB}MB) - Detecting page count...</span>
            </div>
        `;
        feedbackElement.classList.remove('hidden');
    }
    
    // Auto-detect page count
    try {
        const pageCount = await countFilePages(file);
        
        if (pageCount !== null && pageCountInput) {
            pageCountInput.value = pageCount;
            updatePrintingPriceDisplay();
            
            // Show success with page count info
            if (feedbackElement) {
                feedbackElement.innerHTML = `
                    <div class="flex items-center gap-2 text-green-600">
                        <i class="bi bi-check-circle-fill"></i>
                        <span><strong>${file.name}</strong> (${fileSizeMB}MB) - ${pageCount} page${pageCount !== 1 ? 's' : ''} detected</span>
                    </div>
                `;
            }
        } else {
            // Could not detect page count (Word/Excel)
            if (pageCountInput && !pageCountInput.value) {
                pageCountInput.value = 1; // Default to 1
            }
            
            if (feedbackElement) {
                feedbackElement.innerHTML = `
                    <div class="flex flex-col gap-1">
                        <div class="flex items-center gap-2 text-green-600">
                            <i class="bi bi-check-circle-fill"></i>
                            <span><strong>${file.name}</strong> (${fileSizeMB}MB) - Ready to upload</span>
                        </div>
                        <div class="flex items-center gap-2 text-amber-600 text-sm">
                            <i class="bi bi-exclamation-triangle-fill"></i>
                            <span>Please verify the page count for this document.</span>
                        </div>
                    </div>
                `;
            }
            
            // Show toast notification
            if (typeof showToast === 'function') {
                showToast('Please verify page count for documents.', 'warning');
            }
        }
    } catch (error) {
        console.error('Error detecting page count:', error);
        // Show success without page count
        if (feedbackElement) {
            feedbackElement.innerHTML = `
                <div class="flex items-center gap-2 text-green-600">
                    <i class="bi bi-check-circle-fill"></i>
                    <span><strong>${file.name}</strong> (${fileSizeMB}MB) - Ready to upload</span>
                </div>
            `;
        }
    }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Initialize printing form listeners
 */
function initializePrintingForm() {
    // Load prices on initialization
    loadPrintingPrices();
    
    // File input listener
    const fileInput = document.getElementById('printFile');
    if (fileInput) {
        fileInput.addEventListener('change', handlePrintFileChange);
    }
    
    // Price calculation listeners
    const priceInputs = ['pageCount', 'colorMode', 'paperSize', 'copies', 'doubleSided'];
    priceInputs.forEach(inputId => {
        const element = document.getElementById(inputId);
        if (element) {
            element.addEventListener('change', updatePrintingPriceDisplay);
            element.addEventListener('input', updatePrintingPriceDisplay);
        }
    });
}

/**
 * Get printing form data
 */
function getPrintingFormData() {
    const fileInput = document.getElementById('printFile');
    const file = fileInput?.files[0];
    
    if (!file) {
        return null;
    }
    
    const validation = validatePrintFile(file);
    if (!validation.valid) {
        showToast(validation.message, 'error');
        return null;
    }
    
    const pageCount = parseInt(document.getElementById('pageCount')?.value) || 0;
    if (pageCount <= 0) {
        showToast('Please enter the number of pages', 'error');
        return null;
    }
    
    const formData = {
        file: file,
        fileName: file.name,
        fileSize: file.size,
        pageCount: pageCount,
        colorMode: document.getElementById('colorMode')?.value || 'B&W',
        paperSize: document.getElementById('paperSize')?.value || 'A4',
        copies: parseInt(document.getElementById('copies')?.value) || 1,
        doubleSided: document.getElementById('doubleSided')?.checked || false,
        instructions: document.getElementById('printInstructions')?.value || '',
        estimatedPrice: updatePrintingPriceDisplay()
    };
    
    return formData;
}

/**
 * Reset printing form
 */
function resetPrintingForm() {
    const fileInput = document.getElementById('printFile');
    if (fileInput) fileInput.value = '';
    
    const pageCount = document.getElementById('pageCount');
    if (pageCount) pageCount.value = '';
    
    const colorMode = document.getElementById('colorMode');
    if (colorMode) colorMode.value = 'B&W';
    
    const paperSize = document.getElementById('paperSize');
    if (paperSize) paperSize.value = 'A4';
    
    const copies = document.getElementById('copies');
    if (copies) copies.value = '1';
    
    const doubleSided = document.getElementById('doubleSided');
    if (doubleSided) doubleSided.checked = false;
    
    const instructions = document.getElementById('printInstructions');
    if (instructions) instructions.value = '';
    
    const fileFeedback = document.getElementById('fileFeedback');
    if (fileFeedback) {
        fileFeedback.innerHTML = '';
        fileFeedback.classList.add('hidden');
    }
    
    updatePrintingPriceDisplay();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePrintingForm);
} else {
    initializePrintingForm();
}
