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

// Invoice Number Generation System
let lastInvoiceNumber = 0;
let currentYear = new Date().getFullYear();

// Global message display function (if not defined elsewhere)
function showMessage(message, type) {
    // Try to use existing message function, or create a simple one
    const messageEl = document.getElementById('auth-message') || 
                     document.getElementById('invoice-message') ||
                     createMessageElement();
    
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.classList.remove('hidden');
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageEl.classList.add('hidden');
            }, 3000);
        }
    } else {
        // Fallback: use alert for errors
        if (type === 'error') {
            alert(`Error: ${message}`);
        }
    }
}

// Create message element if it doesn't exist
function createMessageElement() {
    const messageEl = document.createElement('div');
    messageEl.id = 'invoice-message';
    messageEl.className = 'message hidden';
    document.body.appendChild(messageEl);
    return messageEl;
}

// Generate professional invoice number
function generateInvoiceNumber() {
    const user = getAuth().currentUser;
    if (!user) return 'INV-XXXX-XXXX';
    
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const year = currentYear.toString().slice(-2);
    
    // Format: INV-YY-XXXX
    return `INV-${year}-${(timestamp % 10000).toString().padStart(4, '0')}`;
}

// Get next invoice number from Firestore
async function getNextInvoiceNumber() {
    const user = auth.currentUser;
    if (!user) return generateInvoiceNumber();
    
    try {
        // Try to get the latest invoice number
        const snapshot = await db.collection('invoices')
            .where('createdBy', '==', user.uid)
            .orderBy('invoiceNumber', 'desc')
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            // First invoice for this user
            return `INV-${currentYear.toString().slice(-2)}-0001`;
        }
        
        const lastInvoice = snapshot.docs[0].data();
        const lastNumber = lastInvoice.invoiceNumber;
        
        // Extract and increment the number
        const match = lastNumber.match(/INV-\d+-(\d+)/);
        if (match) {
            const nextNum = parseInt(match[1]) + 1;
            return `INV-${currentYear.toString().slice(-2)}-${nextNum.toString().padStart(4, '0')}`;
        }
        
        return generateInvoiceNumber();
    } catch (error) {
        console.error('Error getting next invoice number:', error);
        return generateInvoiceNumber();
    }
}

// Initialize invoice form functionality
function initInvoiceForm() {
    console.log('Initializing invoice form...');
    
    // Check if required elements exist
    const addProductBtn = document.getElementById('add-product-btn');
    const productsContainer = document.getElementById('products-container');
    const invoiceForm = document.getElementById('invoice-form');
    
    if (!addProductBtn || !productsContainer || !invoiceForm) {
        console.error('Required invoice form elements not found');
        return;
    }
    
    // Add product row
    addProductBtn.addEventListener('click', addProductRow);
    
    // Calculate totals when inputs change
    productsContainer.addEventListener('input', calculateTotals);
    
    // Handle form submission
    invoiceForm.addEventListener('submit', saveInvoice);
    
    // Initialize product search
    initProductSearch();
    
    // Initialize with one product row
    addProductRow();
    
    // Display next invoice number
    displayNextInvoiceNumber();
    
    // Load available products for search - This is crucial
    loadAvailableProducts();
    
    // Also load products when the page becomes visible
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && document.getElementById('invoice-page').classList.contains('active')) {
            loadAvailableProducts();
        }
    });
}

// Display next available invoice number
async function displayNextInvoiceNumber() {
    const invoiceNumber = await getNextInvoiceNumber();
    const invoiceHeader = document.querySelector('.invoice-header h2');
    
    if (invoiceHeader) {
        invoiceHeader.innerHTML = `Create New Invoice <small class="invoice-number-preview">Next: ${invoiceNumber}</small>`;
    }
}

// Add a new product row to the invoice form
function addProductRow() {
    const productsContainer = document.getElementById('products-container');
    if (!productsContainer) return;
    
    const productRow = document.createElement('div');
    productRow.className = 'product-row';
    productRow.innerHTML = `
        <div class="form-group">
            <label>Product Name</label>
            <input type="text" class="product-name" required>
        </div>
        <div class="form-group">
            <label>Quantity</label>
            <input type="number" class="product-quantity" min="1" value="1" required>
        </div>
        <div class="form-group">
            <label>Price (₹)</label>
            <input type="number" class="product-price" min="0" step="0.01" required>
        </div>
        <div class="form-group">
            <label>GST (%)</label>
            <input type="number" class="product-gst" min="0" max="100" value="18" required>
        </div>
        <div class="form-group">
            <label>Total (₹)</label>
            <input type="text" class="product-total" readonly>
        </div>
        <button type="button" class="btn-remove-product">Remove</button>
    `;
    
    productsContainer.appendChild(productRow);
    
    // Add event listener to remove button
    productRow.querySelector('.btn-remove-product').addEventListener('click', function() {
        // Only remove if there's more than one product row
        if (document.querySelectorAll('.product-row').length > 1) {
            productRow.remove();
            calculateTotals();
        } else {
            alert('Invoice must have at least one product.');
        }
    });
    
    // Calculate initial total for the new row
    calculateProductTotal(productRow);
}

// Calculate total for a single product row
function calculateProductTotal(productRow) {
    let quantity = parseFloat(productRow.querySelector('.product-quantity').value) || 0;
    let price = parseFloat(productRow.querySelector('.product-price').value) || 0;
    let gstPercent = parseFloat(productRow.querySelector('.product-gst').value) || 0;
    
    // Validate inputs
    if (quantity < 0) quantity = 0;
    if (price < 0) price = 0;
    if (gstPercent < 0) gstPercent = 0;
    if (gstPercent > 100) gstPercent = 100;
    
    const subtotal = quantity * price;
    const gstAmount = subtotal * (gstPercent / 100);
    const total = subtotal + gstAmount;
    
    productRow.querySelector('.product-total').value = `₹${total.toFixed(2)}`;
    
    return {
        subtotal,
        gstAmount,
        total
    };
}

// Calculate all totals for the invoice
function calculateTotals() {
    const productRows = document.querySelectorAll('.product-row');
    let subtotal = 0;
    let gstTotal = 0;
    let grandTotal = 0;
    
    productRows.forEach(row => {
        const totals = calculateProductTotal(row);
        subtotal += totals.subtotal;
        gstTotal += totals.gstAmount;
        grandTotal += totals.total;
    });
    
    // Update summary
    const subtotalEl = document.getElementById('subtotal-amount');
    const gstEl = document.getElementById('gst-amount');
    const grandTotalEl = document.getElementById('grand-total');
    
    if (subtotalEl) subtotalEl.textContent = `₹${subtotal.toFixed(2)}`;
    if (gstEl) gstEl.textContent = `₹${gstTotal.toFixed(2)}`;
    if (grandTotalEl) grandTotalEl.textContent = `₹${grandTotal.toFixed(2)}`;
}

// Save invoice to Firestore
async function saveInvoice(e) {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        showMessage('Please log in to save invoices', 'error');
        return;
    }

    // Generate invoice number
    const invoiceNumber = await getNextInvoiceNumber();
    
    // Get customer details
    const customerName = document.getElementById('customer-name').value;
    const customerMobile = document.getElementById('customer-mobile').value;
    
    if (!customerName || !customerMobile) {
        showMessage('Please fill in customer details', 'error');
        return;
    }
    
    // Get products
    const products = [];
    const productRows = document.querySelectorAll('.product-row');
    
    let hasValidProducts = false;
    productRows.forEach(row => {
        const productName = row.querySelector('.product-name').value;
        const quantity = parseFloat(row.querySelector('.product-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.product-price').value) || 0;
        const gst = parseFloat(row.querySelector('.product-gst').value) || 0;
        const totalElement = row.querySelector('.product-total').value;
        const total = totalElement ? parseFloat(totalElement.replace('₹', '')) : 0;
        
        if (productName.trim() && quantity > 0 && price > 0) {
            products.push({
                name: productName,
                quantity: quantity,
                price: price,
                gst: gst,
                total: total
            });
            hasValidProducts = true;
        }
    });
    
    if (!hasValidProducts) {
        showMessage('Please add at least one valid product', 'error');
        return;
    }
    
    // Calculate totals
    const subtotal = parseFloat(document.getElementById('subtotal-amount').textContent.replace('₹', '')) || 0;
    const gstAmount = parseFloat(document.getElementById('gst-amount').textContent.replace('₹', '')) || 0;
    const grandTotal = parseFloat(document.getElementById('grand-total').textContent.replace('₹', '')) || 0;
    
    // Create invoice object with invoice number
    const invoice = {
        invoiceNumber: invoiceNumber,
        customerName: customerName,
        customerMobile: customerMobile,
        products: products,
        subtotal: subtotal,
        gstAmount: gstAmount,
        grandTotal: grandTotal,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: user.uid,
        status: 'active'
    };
    
    try {
        // Save to Firestore
        const docRef = await db.collection('invoices').add(invoice);
        
        // Update stock levels
        await updateProductStock(products);
        
        showMessage(`Invoice ${invoiceNumber} saved successfully!`, 'success');
        resetInvoiceForm();
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            if (typeof showPage === 'function') {
                showPage('dashboard-page');
            }
            if (typeof loadDashboardData === 'function') {
                loadDashboardData();
            }
        }, 2000);
    } catch (error) {
        showMessage('Error saving invoice: ' + error.message, 'error');
    }
}

// Reset invoice form
function resetInvoiceForm() {
    const invoiceForm = document.getElementById('invoice-form');
    if (!invoiceForm) return;
    
    invoiceForm.reset();
    
    // Remove all but one product row
    const productRows = document.querySelectorAll('.product-row');
    for (let i = 1; i < productRows.length; i++) {
        productRows[i].remove();
    }
    
    // Reset the first product row
    const firstRow = document.querySelector('.product-row');
    if (firstRow) {
        firstRow.querySelector('.product-name').value = '';
        firstRow.querySelector('.product-quantity').value = '1';
        firstRow.querySelector('.product-price').value = '';
        firstRow.querySelector('.product-gst').value = '18';
        firstRow.querySelector('.product-total').value = '';
    }
    
    // Reset totals
    calculateTotals();
}

// Load recent invoices for dashboard
function loadRecentInvoices() {
    // Use safe auth access
    let user;
    try {
        user = getAuth().currentUser;
    } catch (error) {
        console.log('Auth not ready yet');
        return;
    }
    
    if (!user) {
        console.log('No user logged in for recent invoices');
        const invoicesList = document.getElementById('invoices-list');
        if (invoicesList) {
            invoicesList.innerHTML = '<p>Please log in to view invoices</p>';
        }
        return;
    }

    const invoicesList = document.getElementById('invoices-list');
    if (!invoicesList) {
        console.log('Invoices list element not found');
        return;
    }

    invoicesList.innerHTML = '<p>Loading invoices...</p>';

    console.log('Loading recent invoices for user:', user.uid);

    // Use safe db access
    let dbInstance;
    try {
        dbInstance = getDb();
    } catch (error) {
        console.error('Database not available:', error);
        invoicesList.innerHTML = '<p class="error">Database connection error</p>';
        return;
    }

    dbInstance.collection('invoices')
        .where('createdBy', '==', user.uid)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get()
        .then((querySnapshot) => {
            invoicesList.innerHTML = '';
            
            if (querySnapshot.empty) {
                invoicesList.innerHTML = '<p class="no-invoices">No invoices found. Create your first invoice!</p>';
                return;
            }

            const invoices = [];
            querySnapshot.forEach((doc) => {
                invoices.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            console.log(`Loaded ${invoices.length} recent invoices`);

            invoices.forEach((invoice) => {
                const invoiceDate = invoice.createdAt ? 
                    invoice.createdAt.toDate().toLocaleDateString() : 'Date not available';
                
                const invoiceItem = document.createElement('div');
                invoiceItem.className = 'invoice-item';
                invoiceItem.innerHTML = `
                    <div class="invoice-customer">${invoice.customerName}</div>
                    <div class="invoice-mobile">${invoice.customerMobile}</div>
                    <div class="invoice-date">${invoiceDate}</div>
                    <div class="invoice-amount">₹${invoice.grandTotal.toFixed(2)}</div>
                    <div class="invoice-actions">
                        <button class="btn-secondary view-invoice-btn" data-id="${invoice.id}">View</button>
                    </div>
                `;
                
                invoicesList.appendChild(invoiceItem);
            });

            // Add event listeners to view buttons
            document.querySelectorAll('.view-invoice-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const invoiceId = this.getAttribute('data-id');
                    viewInvoice(invoiceId);
                });
            });
        })
        .catch((error) => {
            console.error('Error loading recent invoices:', error);
            invoicesList.innerHTML = '<p class="error">Error loading invoices</p>';
            
            // Don't show error message for permission issues when collection doesn't exist yet
            if (error.code !== 'failed-precondition' && error.code !== 'permission-denied') {
                showMessage('Error loading invoices: ' + error.message, 'error');
            }
        });
}

// View invoice details
function viewInvoice(invoiceId) {
    db.collection('invoices').doc(invoiceId).get()
        .then((doc) => {
            if (doc.exists) {
                generateInvoicePreview(doc.data(), doc.id);
                document.getElementById('invoice-preview-modal').classList.remove('hidden');
            } else {
                showMessage('Invoice not found', 'error');
            }
        })
        .catch((error) => {
            showMessage('Error loading invoice: ' + error.message, 'error');
        });
}

// Print invoice
function printInvoice(invoiceId) {
    db.collection('invoices').doc(invoiceId).get()
        .then((doc) => {
            if (doc.exists) {
                generateInvoicePreview(doc.data(), doc.id);
                
                // Wait for the preview to render, then print
                setTimeout(() => {
                    window.print();
                }, 500);
            } else {
                showMessage('Invoice not found', 'error');
            }
        })
        .catch((error) => {
            showMessage('Error loading invoice: ' + error.message, 'error');
        });
}

// Generate clean professional invoice preview
function generateInvoicePreview(invoice, invoiceId, isPreview = false) {
    const previewContent = document.getElementById('invoice-preview-content');
    if (!previewContent) return;
    
    // Format date
    let invoiceDate;
    if (invoice.createdAt) {
        if (typeof invoice.createdAt.toDate === 'function') {
            invoiceDate = invoice.createdAt.toDate().toLocaleDateString();
        } else {
            invoiceDate = new Date(invoice.createdAt).toLocaleDateString();
        }
    } else {
        invoiceDate = new Date().toLocaleDateString();
    }
    
    // Use invoice number if available, otherwise use ID
    const displayInvoiceNumber = invoice.invoiceNumber || invoiceId;
    
    // Generate products table rows
    let productsRows = '';
    if (invoice.products && invoice.products.length > 0) {
        invoice.products.forEach((product, index) => {
            productsRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${product.name}</td>
                    <td>${product.quantity}</td>
                    <td>₹${product.price.toFixed(2)}</td>
                    <td>${product.gst}%</td>
                    <td>₹${product.total.toFixed(2)}</td>
                </tr>
            `;
        });
    }
    
    previewContent.innerHTML = `
        <div class="invoice-preview-content">
            <!-- Simple Professional Header -->
            <div class="invoice-header-preview">
                <div class="company-info">
                    <h2>SHIVAM INDANE GAS</h2>
                    <p>Professional Gas Services</p>
                </div>
                <div class="invoice-meta">
                    <div class="invoice-details-meta">
                        <div class="invoice-meta-row">
                            <strong>Invoice #:</strong> ${displayInvoiceNumber}
                        </div>
                        <div class="invoice-meta-row">
                            <strong>Date:</strong> ${invoiceDate}
                        </div>
                        ${invoice.status ? `
                        <div class="invoice-meta-row">
                            <strong>Status:</strong> <span class="invoice-status">${invoice.status}</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Customer Information -->
            <div class="customer-section">
                <div class="customer-info-preview">
                    <h4>Bill To:</h4>
                    <p><strong>${invoice.customerName}</strong></p>
                    <p>Mobile: ${invoice.customerMobile}</p>
                </div>
            </div>
            
            <!-- Products Table -->
            <table class="products-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Product/Service</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>GST %</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsRows}
                </tbody>
            </table>
            
            <!-- Totals Section -->
            <div class="totals-preview">
                <div class="totals-row">
                    <span>Subtotal:</span>
                    <span>₹${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div class="totals-row">
                    <span>GST Total:</span>
                    <span>₹${invoice.gstAmount.toFixed(2)}</span>
                </div>
                <div class="totals-row total">
                    <span>Grand Total:</span>
                    <span>₹${invoice.grandTotal.toFixed(2)}</span>
                </div>
            </div>
            
            <!-- Simple Footer -->
            <div class="invoice-footer">
                <p>Thank you for your business!</p>
                <p class="terms">Payment due within 30 days</p>
            </div>
        </div>
    `;
}

// Product search functionality for invoice form
function initProductSearch() {
    const searchInput = document.getElementById('product-search');
    const searchResults = document.getElementById('product-search-results');
    
    if (!searchInput || !searchResults) return;
    
    searchInput.addEventListener('input', debounce(function(e) {
        const searchTerm = e.target.value.trim();
        
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        searchProducts(searchTerm, searchResults);
    }, 300));
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

// Search products from available inventory
function searchProducts(searchTerm, resultsContainer) {
    if (!window.availableProducts || window.availableProducts.length === 0) {
        resultsContainer.innerHTML = '<div class="product-search-item">No products available. Add products in Stock Management.</div>';
        resultsContainer.style.display = 'block';
        return;
    }
    
    const filteredProducts = window.availableProducts.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        product.stock > 0 // Only show products in stock
    );
    
    if (filteredProducts.length === 0) {
        resultsContainer.innerHTML = '<div class="product-search-item">No matching products found.</div>';
    } else {
        resultsContainer.innerHTML = filteredProducts.map(product => `
            <div class="product-search-item" 
                 data-name="${product.name}" 
                 data-price="${product.price}" 
                 data-gst="${product.gst}">
                <span class="product-search-name">${product.name}</span>
                <span class="product-search-price">₹${product.price.toFixed(2)} (${product.gst}% GST)</span>
            </div>
        `).join('');
        
        // Add click event listeners
        resultsContainer.querySelectorAll('.product-search-item').forEach(item => {
            item.addEventListener('click', function() {
                const name = this.getAttribute('data-name');
                const price = this.getAttribute('data-price');
                const gst = this.getAttribute('data-gst');
                
                addProductFromSearch(name, price, gst);
                resultsContainer.style.display = 'none';
                document.getElementById('product-search').value = '';
            });
        });
    }
    
    resultsContainer.style.display = 'block';
}

// Add product from search results
function addProductFromSearch(name, price, gst) {
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

// Debounce function for search
function debounce(func, wait) {
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

function loadAvailableProducts() {
    const user = auth.currentUser;
    if (!user) return;

    db.collection('products')
        .where('createdBy', '==', user.uid)
        .where('stock', '>', 0) // Only products with stock
        .get()
        .then((querySnapshot) => {
            window.availableProducts = [];
            querySnapshot.forEach((doc) => {
                window.availableProducts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            console.log(`Loaded ${window.availableProducts.length} available products for search`);
        })
        .catch((error) => {
            console.error('Error loading products for search:', error);
            window.availableProducts = [];
        });
}

async function updateProductStock(products) {
    const user = auth.currentUser;
    if (!user) return;

    const batch = db.batch();
    
    for (const product of products) {
        // Find the product in available products
        const availableProduct = window.availableProducts.find(p => 
            p.name === product.name && p.price === product.price && p.gst === product.gst
        );
        
        if (availableProduct) {
            const newStock = availableProduct.stock - product.quantity;
            const productRef = db.collection('products').doc(availableProduct.id);
            
            if (newStock >= 0) {
                batch.update(productRef, {
                    stock: newStock,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } else {
                console.warn(`Insufficient stock for ${product.name}`);
                showMessage(`Warning: Insufficient stock for ${product.name}`, 'error');
            }
        }
    }
    
    try {
        await batch.commit();
        console.log('Stock levels updated successfully');
    } catch (error) {
        console.error('Error updating stock levels:', error);
    }
}

// Make this function globally accessible
window.loadAvailableProducts = function() {
    const user = auth.currentUser;
    if (!user) return;

    db.collection('products')
        .where('createdBy', '==', user.uid)
        .where('stock', '>', 0) // Only products with stock
        .get()
        .then((querySnapshot) => {
            window.availableProducts = [];
            querySnapshot.forEach((doc) => {
                window.availableProducts.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            console.log(`Loaded ${window.availableProducts.length} available products for search`);
        })
        .catch((error) => {
            console.error('Error loading products for search:', error);
            window.availableProducts = [];
        });
}

// Initialize invoice functionality when invoice page becomes active
function initInvoicePage() {
    console.log('Initializing invoice page...');
    initInvoiceForm();
    
    // Setup invoice preview modal
    const previewBtn = document.getElementById('preview-invoice-btn');
    const closePreview = document.getElementById('close-preview');
    const closePreviewBtn = document.getElementById('close-preview-btn');
    const printBtn = document.getElementById('print-invoice-btn');
    
    if (previewBtn) {
        previewBtn.addEventListener('click', function() {
            // Validate form before preview
            const customerName = document.getElementById('customer-name').value;
            const customerMobile = document.getElementById('customer-mobile').value;
            
            if (!customerName || !customerMobile) {
                showMessage('Please fill in customer details before previewing', 'error');
                return;
            }
            
            // Validate at least one product has data
            const productRows = document.querySelectorAll('.product-row');
            let hasValidProduct = false;
            
            productRows.forEach(row => {
                const productName = row.querySelector('.product-name').value;
                if (productName.trim()) {
                    hasValidProduct = true;
                }
            });
            
            if (!hasValidProduct) {
                showMessage('Please add at least one product before previewing', 'error');
                return;
            }
            
            // Create a temporary invoice object for preview
            const tempInvoice = {
                customerName: customerName,
                customerMobile: customerMobile,
                products: [],
                subtotal: parseFloat(document.getElementById('subtotal-amount').textContent.replace('₹', '')) || 0,
                gstAmount: parseFloat(document.getElementById('gst-amount').textContent.replace('₹', '')) || 0,
                grandTotal: parseFloat(document.getElementById('grand-total').textContent.replace('₹', '')) || 0,
                createdAt: new Date()
            };
            
            // Get products from form
            productRows.forEach(row => {
                const productName = row.querySelector('.product-name').value;
                const quantity = parseFloat(row.querySelector('.product-quantity').value) || 0;
                const price = parseFloat(row.querySelector('.product-price').value) || 0;
                const gst = parseFloat(row.querySelector('.product-gst').value) || 0;
                const totalElement = row.querySelector('.product-total').value;
                const total = totalElement ? parseFloat(totalElement.replace('₹', '')) : 0;
                
                if (productName.trim()) {
                    tempInvoice.products.push({
                        name: productName,
                        quantity: quantity,
                        price: price,
                        gst: gst,
                        total: total
                    });
                }
            });
            
            generateInvoicePreview(tempInvoice, 'PREVIEW');
            document.getElementById('invoice-preview-modal').classList.remove('hidden');
        });
    }
    
    if (closePreview) {
        closePreview.addEventListener('click', function() {
            document.getElementById('invoice-preview-modal').classList.add('hidden');
        });
    }
    
    if (closePreviewBtn) {
        closePreviewBtn.addEventListener('click', function() {
            document.getElementById('invoice-preview-modal').classList.add('hidden');
        });
    }
    
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            window.print();
        });
    }
}

// Safe initialization for invoice page
function initInvoicePageSafely() {
    // Wait for auth to be available
    if (typeof auth === 'undefined' || !auth) {
        setTimeout(initInvoicePageSafely, 100);
        return;
    }
    
    // Only initialize if we're on the invoice page and user is authenticated
    if (document.getElementById('invoice-page') && auth.currentUser) {
        console.log('Invoice page detected, initializing...');
        initInvoicePage();
    }
}

// Check if we're on the invoice page and initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initInvoicePageSafely);

// Also initialize when the page becomes visible (for single page app navigation)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && document.getElementById('invoice-page') && 
        document.getElementById('invoice-page').classList.contains('active') && 
        auth.currentUser) {
        console.log('Invoice page became active, initializing...');
        // Re-initialize product search when switching to invoice page
        if (typeof loadAvailableProducts === 'function') {
            loadAvailableProducts();
        }
    }
});
