/**
 * Inventory Helper - Client-side stock management utilities
 * Fetches inventory data and provides helper functions for displaying stock status
 */

// Dynamic API base path - works on both localhost and production
const getApiBase = () => {
    const path = window.location.pathname;
    const base = path.substring(0, path.indexOf('/pages/'));
    return base ? base + '/php/api' : '../../php/api';
};

let inventoryCache = [];
let inventoryLastFetch = 0;
const CACHE_DURATION = 30000; // 30 seconds

/**
 * Fetch available inventory items from API
 * @param {boolean} forceRefresh - Force refresh even if cache is valid
 * @returns {Promise<Array>} Array of inventory items
 */
async function fetchInventory(forceRefresh = false) {
    const now = Date.now();
    
    // Use cache if available and not expired
    if (!forceRefresh && inventoryCache.length > 0 && (now - inventoryLastFetch) < CACHE_DURATION) {
        return inventoryCache;
    }
    
    try {
        const response = await fetch(`${getApiBase()}/inventory.php`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.items) {
            inventoryCache = result.data.items;
            inventoryLastFetch = now;
            return inventoryCache;
        }
        
        console.error('Failed to fetch inventory:', result.message);
        return [];
    } catch (error) {
        console.error('Error fetching inventory:', error);
        return [];
    }
}

/**
 * Get stock badge HTML for display
 * @param {number} quantity - Current stock quantity
 * @param {number} threshold - Low stock threshold
 * @param {boolean} isAvailable - Item availability status
 * @returns {string} HTML string for stock badge
 */
function getStockBadgeHTML(quantity, threshold, isAvailable = true) {
    if (!isAvailable || quantity === 0) {
        return '<span class="stock-badge out-of-stock">🔴 Out of Stock</span>';
    } else if (quantity <= threshold) {
        return `<span class="stock-badge low-stock">⚠️ Low Stock (${quantity} left)</span>`;
    } else {
        return '<span class="stock-badge in-stock">✅ In Stock</span>';
    }
}

/**
 * Get stock status class for styling
 * @param {number} quantity - Current stock quantity
 * @param {number} threshold - Low stock threshold
 * @returns {string} CSS class name
 */
function getStockStatusClass(quantity, threshold) {
    if (quantity === 0) return 'out-of-stock';
    if (quantity <= threshold) return 'low-stock';
    return 'in-stock';
}

/**
 * Check if item is available for ordering
 * @param {Object} item - Inventory item object
 * @returns {boolean} True if item can be ordered
 */
function isItemAvailable(item) {
    return item.is_available == 1 && item.is_active == 1 && item.stock_quantity > 0;
}

/**
 * Populate select dropdown with inventory items
 * @param {string} selectId - ID of the select element
 * @param {boolean} showOutOfStock - Whether to show out of stock items (disabled)
 */
async function populateInventorySelect(selectId, showOutOfStock = false) {
    const selectElement = document.getElementById(selectId);
    if (!selectElement) {
        console.error(`Select element ${selectId} not found`);
        return;
    }
    
    const items = await fetchInventory();
    
    // Clear existing options except the first placeholder
    const placeholder = selectElement.options[0];
    selectElement.innerHTML = '';
    if (placeholder) {
        selectElement.add(placeholder);
    }
    
    items.forEach(item => {
        const isAvailable = isItemAvailable(item);
        
        // Skip out of stock items if not showing them
        if (!showOutOfStock && !isAvailable) {
            return;
        }
        
        const option = document.createElement('option');
        option.value = item.item_name.toLowerCase();
        
        // Add stock indicator to option text
        let optionText = item.item_name;
        if (!isAvailable || item.stock_quantity === 0) {
            optionText += ' - OUT OF STOCK';
            option.disabled = true;
            option.style.color = '#999';
        } else if (item.stock_quantity <= item.low_stock_threshold) {
            optionText += ` - Low Stock (${item.stock_quantity} left)`;
            option.style.color = '#f59e0b';
        }
        
        option.textContent = optionText;
        option.dataset.stockQuantity = item.stock_quantity;
        option.dataset.lowStockThreshold = item.low_stock_threshold;
        option.dataset.isAvailable = item.is_available;
        
        selectElement.add(option);
    });
}

/**
 * Create inventory grid for dashboard display
 * @param {string} containerId - ID of container element
 * @param {Function} onItemClick - Callback when item is clicked
 */
async function renderInventoryGrid(containerId, onItemClick) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container ${containerId} not found`);
        return;
    }
    
    const items = await fetchInventory();
    const availableItems = items.filter(item => isItemAvailable(item));
    
    if (availableItems.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-box-open text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No items available at the moment</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = availableItems.map(item => {
        const stockBadge = getStockBadgeHTML(item.stock_quantity, item.low_stock_threshold, item.is_available == 1);
        const statusClass = getStockStatusClass(item.stock_quantity, item.low_stock_threshold);
        
        return `
            <div class="inventory-card ${statusClass}" 
                 onclick="${onItemClick ? onItemClick.name + '(\'' + item.item_name + '\')' : ''}"
                 data-item-id="${item.item_id}"
                 data-item-name="${item.item_name}">
                <div class="card-header">
                    <h3 class="item-name">${item.item_name}</h3>
                    ${stockBadge}
                </div>
                ${item.description ? `<p class="item-description">${item.description}</p>` : ''}
                <div class="card-footer">
                    <div class="stock-info">
                        <i class="fas fa-boxes"></i>
                        <span>Stock: ${item.stock_quantity}</span>
                    </div>
                    <div class="time-info">
                        <i class="fas fa-clock"></i>
                        <span>${item.estimated_time} min</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Add stock indicator styles to page
 */
function addStockIndicatorStyles() {
    if (document.getElementById('stock-indicator-styles')) {
        return; // Already added
    }
    
    const style = document.createElement('style');
    style.id = 'stock-indicator-styles';
    style.textContent = `
        .stock-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            white-space: nowrap;
        }
        
        .stock-badge.in-stock {
            background-color: #d1fae5;
            color: #065f46;
        }
        
        .stock-badge.low-stock {
            background-color: #fef3c7;
            color: #92400e;
        }
        
        .stock-badge.out-of-stock {
            background-color: #fee2e2;
            color: #991b1b;
        }
        
        .inventory-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .inventory-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        
        .inventory-card.out-of-stock {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .inventory-card.out-of-stock:hover {
            transform: none;
        }
        
        .inventory-card .card-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 0.75rem;
        }
        
        .inventory-card .item-name {
            font-size: 1.125rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0;
        }
        
        .inventory-card .item-description {
            font-size: 0.875rem;
            color: #6b7280;
            margin-bottom: 1rem;
        }
        
        .inventory-card .card-footer {
            display: flex;
            justify-content: space-between;
            padding-top: 0.75rem;
            border-top: 1px solid #e5e7eb;
            font-size: 0.875rem;
            color: #6b7280;
        }
        
        .inventory-card .stock-info,
        .inventory-card .time-info {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        select option:disabled {
            color: #9ca3af !important;
            font-style: italic;
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize styles when script loads
addStockIndicatorStyles();
