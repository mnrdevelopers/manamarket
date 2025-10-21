// Safe access to auth and db
function getAuth() {
    if (typeof auth !== 'undefined' && auth) {
        return auth;
    }
    if (window.auth) {
        return window.auth;
    }
    throw new Error('Auth not initialized');
}

function getDb() {
    if (typeof db !== 'undefined' && db) {
        return db;
    }
    if (window.db) {
        return window.db;
    }
    throw new Error('Database not initialized');
}

// Stock Management System

let currentProducts = [];
let currentEditingProductId = null;

// Initialize stock management page
function initStockPage() {
    console.log('Initializing stock management...');
    
    // Load products
    loadAllProducts();
    
    // Setup event listeners
    setupStockEventListeners();
}

// Setup event listeners for stock management
function setupStockEventListeners() {
    // Add product button
    const addProductBtn = document.getElementById('add-product-btn-stock');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', showAddProductModal);
    }
    
    // Search functionality
    const searchInput = document.getElementById('search-products');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            filterProducts(e.target.value);
        }, 300));
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-stock');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAllProducts);
    }
    
    // Product modal events
    const closeProductModal = document.getElementById('close-product-modal');
    const cancelProductBtn = document.getElementById('cancel-product-btn');
    const saveProductBtn = document.getElementById('save-product-btn');
    
    if (closeProductModal) {
        closeProductModal.addEventListener('click', closeProductModalHandler);
    }
    
    if (cancelProductBtn) {
        cancelProductBtn.addEventListener('click', closeProductModalHandler);
    }
    
    if (saveProductBtn) {
        saveProductBtn.addEventListener('click', saveProduct);
    }
}

// Load all products for the current user
function loadAllProducts() {
    // Wait for auth to be ready
    if (!auth || !getAuth().currentUser) {
        console.log('Auth not ready, waiting...');
        setTimeout(loadAllProducts, 100);
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        showMessage('Please log in to manage products', 'error');
        return;
    }

    const tableBody = document.getElementById('stock-table-body');
    if (!tableBody) {
        console.log('Stock table body not found, retrying...');
        setTimeout(loadAllProducts, 100);
        return;
    }

    tableBody.innerHTML = '<tr><td colspan="8" class="loading-stock">Loading products...</td></tr>';

    console.log('Loading products for user:', user.uid);

    db.collection('products')
        .where('createdBy', '==', user.uid)
        .get()
        .then((querySnapshot) => {
            currentProducts = [];
            
            querySnapshot.forEach((doc) => {
                currentProducts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort by name
            currentProducts.sort((a, b) => a.name.localeCompare(b.name));

            console.log(`Loaded ${currentProducts.length} products`);
            displayProductsTable();
            
            // Update product cache for invoice form
            updateProductCache();
        })
        .catch((error) => {
            console.error('Error loading products:', error);
            
            if (error.code === 'permission-denied') {
                tableBody.innerHTML = '<tr><td colspan="8" class="no-products-found">Permission denied. Please check Firebase security rules.</td></tr>';
                showMessage('Database permission denied. Please contact administrator.', 'error');
            } else if (error.code === 'failed-precondition') {
                // Collection doesn't exist yet - initialize with empty array
                currentProducts = [];
                displayProductsTable();
            } else {
                tableBody.innerHTML = '<tr><td colspan="8" class="no-products-found">Error loading products</td></tr>';
                showMessage('Error loading products: ' + error.message, 'error');
            }
        });
}

// Display products in the table
function displayProductsTable(filteredProducts = null) {
    const productsToDisplay = filteredProducts || currentProducts;
    const tableBody = document.getElementById('stock-table-body');
    
    if (!tableBody) return;

    if (productsToDisplay.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="no-products-found">No products found. Add your first product!</td></tr>';
        return;
    }

    let tableHTML = '';

    productsToDisplay.forEach((product) => {
        const stockStatus = getStockStatus(product.stock, product.minStock);
        const statusClass = stockStatus === 'Out of Stock' ? 'stock-status-out' : 
                           stockStatus === 'Low Stock' ? 'stock-status-low' : 'stock-status-ok';
        
      tableHTML += `
    <tr>
        <td>${product.name}</td>
        <td>${product.category || 'Uncategorized'}</td>
        <td class="amount-cell">₹${product.price.toFixed(2)}</td>
        <td>${product.gst}%</td>
        <td class="${stockStatus === 'Out of Stock' ? 'stock-status-out' : ''}">${product.stock}</td>
        <td>${product.minStock || 10}</td>
        <td class="${statusClass}">${stockStatus}</td>
        <td class="invoice-actions-cell">
            <button class="btn-edit edit-product" data-id="${product.id}">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-delete delete-product" data-id="${product.id}">
                <i class="fas fa-trash"></i> Delete
            </button>
            <button class="quick-add-product" data-id="${product.id}" data-name="${product.name}" data-price="${product.price}" data-gst="${product.gst}">
                <i class="fas fa-cart-plus"></i> Add to Invoice
            </button>
        </td>
    </tr>
`;
});

    tableBody.innerHTML = tableHTML;

    // Add event listeners
    document.querySelectorAll('.edit-product').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            editProduct(productId);
        });
    });

    document.querySelectorAll('.delete-product').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            deleteProduct(productId);
        });
    });

    document.querySelectorAll('.quick-add-product').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            const productName = this.getAttribute('data-name');
            const productPrice = this.getAttribute('data-price');
            const productGst = this.getAttribute('data-gst');
            
            // Switch to create invoice page and add product
            showPage('invoice-page');
            addProductFromStock(productName, productPrice, productGst);
        });
    });
}

// Get stock status
function getStockStatus(currentStock, minStock = 10) {
    if (currentStock <= 0) {
        return 'Out of Stock';
    } else if (currentStock <= minStock) {
        return 'Low Stock';
    } else {
        return 'In Stock';
    }
}

// Filter products based on search term
function filterProducts(searchTerm) {
    if (!searchTerm.trim()) {
        displayProductsTable();
        return;
    }

    const filteredProducts = currentProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    displayProductsTable(filteredProducts);
}

// Show add product modal
function showAddProductModal() {
    currentEditingProductId = null;
    document.getElementById('product-modal-title').textContent = 'Add New Product';
    document.getElementById('product-form').reset();
    document.getElementById('product-modal').classList.remove('hidden');
}

// Show edit product modal
function editProduct(productId) {
    const product = currentProducts.find(p => p.id === productId);
    if (!product) return;

    currentEditingProductId = productId;
    document.getElementById('product-modal-title').textContent = 'Edit Product';
    
    // Fill form with product data
    document.getElementById('product-name').value = product.name;
    document.getElementById('product-category').value = product.category || '';
    document.getElementById('product-price').value = product.price;
    document.getElementById('product-gst').value = product.gst;
    document.getElementById('product-stock').value = product.stock;
    document.getElementById('product-min-stock').value = product.minStock || 10;
    document.getElementById('product-description').value = product.description || '';
    
    document.getElementById('product-modal').classList.remove('hidden');
}

// Save product (add or update)
function saveProduct(e) {
    if (e) e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        showMessage('Please log in to manage products', 'error');
        return;
    }
    
    // Get form data
    const productData = {
        name: document.getElementById('product-name').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        gst: parseFloat(document.getElementById('product-gst').value),
        stock: parseInt(document.getElementById('product-stock').value),
        minStock: parseInt(document.getElementById('product-min-stock').value) || 10,
        description: document.getElementById('product-description').value,
        createdBy: user.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Validate required fields
    if (!productData.name || !productData.category || isNaN(productData.price) || isNaN(productData.gst) || isNaN(productData.stock)) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    let promise;
    
    if (currentEditingProductId) {
        // Update existing product
        promise = db.collection('products').doc(currentEditingProductId).update(productData);
    } else {
        // Add new product - include createdAt
        productData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        promise = db.collection('products').add(productData);
    }
    
    promise
        .then(() => {
            const action = currentEditingProductId ? 'updated' : 'added';
            showMessage(`Product ${action} successfully!`, 'success');
            closeProductModalHandler();
            loadAllProducts(); // Reload the list
            
            // IMPORTANT: Refresh the product cache for invoice form search
            updateProductCache();
            
            // Also trigger a manual refresh of available products for invoice search
            if (typeof loadAvailableProducts === 'function') {
                loadAvailableProducts();
            }
        })
        .catch((error) => {
            showMessage(`Error ${currentEditingProductId ? 'updating' : 'adding'} product: ` + error.message, 'error');
            console.error('Error saving product:', error);
        });
}

// Delete product
function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
        return;
    }
    
    db.collection('products').doc(productId).delete()
        .then(() => {
            showMessage('Product deleted successfully!', 'success');
            loadAllProducts(); // Reload the list
        })
        .catch((error) => {
            showMessage('Error deleting product: ' + error.message, 'error');
            console.error('Error deleting product:', error);
        });
}

// Close product modal
function closeProductModalHandler() {
    document.getElementById('product-modal').classList.add('hidden');
    currentEditingProductId = null;
}

// Update product cache for invoice form
function updateProductCache() {
    // This will be used by the invoice form for product search
    window.availableProducts = currentProducts;
}

// Add product from stock to invoice form
function addProductFromStock(name, price, gst) {
    // Add a new product row
    addProductRow();
    
    // Get the last added row
    const productRows = document.querySelectorAll('.product-row');
    const lastRow = productRows[productRows.length - 1];
    
    // Fill the row with product data
    lastRow.querySelector('.product-name').value = name;
    lastRow.querySelector('.product-price').value = price;
    lastRow.querySelector('.product-gst').value = gst;
    
    // Trigger calculation
    calculateProductTotal(lastRow);
    calculateTotals();
}

// Safe initialization for stock page
function initStockPageSafely() {
    // Wait for auth to be available
    if (typeof auth === 'undefined' || !auth) {
        setTimeout(initStockPageSafely, 100);
        return;
    }
    
    console.log('Stock.js loaded, checking for stock page...');
    
    // Check if we're on the stock page and wait for auth
    if (document.getElementById('stock-page')) {
        console.log('Stock page detected, waiting for auth...');
        
        // Wait for auth to be ready
        const checkAuthAndInit = () => {
            if (auth && auth.currentUser) {
                console.log('User authenticated, initializing stock page');
                initStockPage();
            } else if (auth) {
                // User not logged in but auth is ready
                console.log('User not logged in, showing message');
                const tableBody = document.getElementById('stock-table-body');
                if (tableBody) {
                    tableBody.innerHTML = '<tr><td colspan="8" class="no-products-found">Please log in to manage products</td></tr>';
                }
            } else {
                // Auth not ready yet, check again
                setTimeout(checkAuthAndInit, 100);
            }
        };
        
        checkAuthAndInit();
    }
}

document.addEventListener('DOMContentLoaded', initStockPageSafely);

// Also initialize when page becomes active (for SPA navigation)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && 
        document.getElementById('stock-page') && 
        document.getElementById('stock-page').classList.contains('active')) {
        console.log('Stock page became active');
        if (auth && auth.currentUser) {
            loadAllProducts();
        }
    }
});
