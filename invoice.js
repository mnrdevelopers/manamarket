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

// Sequential Invoice Number Generation - No Special Permissions Needed
let currentYear = new Date().getFullYear();
let availableCustomers = []; // Global list of customers for auto-fill

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
            console.error(`Error: ${message}`);
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

// Get next sequential invoice number
async function getNextInvoiceNumber() {
    const user = auth.currentUser;
    if (!user) return generateFallbackInvoiceNumber();

    try {
        // Get the latest invoice to determine next number
        const snapshot = await db.collection('invoices')
            .where('createdBy', '==', user.uid)
            .get(); // Fetch all and sort client-side to avoid index requirement
        
        let nextNumber = 1;

        if (!snapshot.empty) {
            const invoices = [];
            snapshot.forEach(doc => invoices.push(doc.data()));

            // Sort by createdAt client-side (descending)
            invoices.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));

            const lastInvoice = invoices[0];
            const lastInvoiceNumber = lastInvoice.invoiceNumber;
            
            // Extract number from format: INV-YY-XXXX
            const match = lastInvoiceNumber.match(/INV-\d+-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1]) + 1;
            } else {
                // Fallback: count total invoices
                nextNumber = invoices.length + 1;
            }
        }
        
        // Format: INV-YY-0001, INV-YY-0002, etc.
        const year = currentYear.toString().slice(-2);
        return `INV-${year}-${nextNumber.toString().padStart(4, '0')}`;
        
    } catch (error) {
        console.error('Error getting next invoice number:', error);
        return generateFallbackInvoiceNumber();
    }
}

// Fallback invoice number generation
function generateFallbackInvoiceNumber() {
    const timestamp = Date.now();
    const year = currentYear.toString().slice(-2);
    const random = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    return `INV-${year}-${random.toString()}`;
}

// Display next available invoice number
async function displayNextInvoiceNumber() {
    const invoiceHeader = document.querySelector('.invoice-header h2');
    if (!invoiceHeader) return;
    
    try {
        const user = auth.currentUser;
        if (!user) {
            invoiceHeader.innerHTML = `Create New Invoice <small class="invoice-number-preview">Next: Please login</small>`;
            return;
        }

        const nextInvoiceNumber = await getNextInvoiceNumber();
        invoiceHeader.innerHTML = `Create New Invoice <small class="invoice-number-preview">Next: ${nextInvoiceNumber}</small>`;
        
    } catch (error) {
        console.error('Error displaying next invoice number:', error);
        // Don't show error to user, just show loading
        invoiceHeader.innerHTML = `Create New Invoice <small class="invoice-number-preview">Next: Error...</small>`;
    }
}

// ----------------------------------------------------
// Customer Management and Auto-fill
// ----------------------------------------------------

async function loadAvailableCustomers() {
    const user = getAuth().currentUser;
    if (!user) return;

    try {
        const querySnapshot = await getDb().collection('customers')
            .where('createdBy', '==', user.uid)
            .get();
            
        availableCustomers = [];
        querySnapshot.forEach((doc) => {
            availableCustomers.push({
                id: doc.id,
                ...doc.data()
            });
        });
        console.log(`Loaded ${availableCustomers.length} available customers for auto-fill.`);
    } catch (error) {
        console.error('Error loading customers for auto-fill:', error);
    }
}

function initCustomerSearch() {
    const nameInput = document.getElementById('customer-name');
    const mobileInput = document.getElementById('customer-mobile');
    const addressInput = document.getElementById('customer-address');
    const searchResults = document.getElementById('customer-search-results');

    if (!nameInput || !searchResults) return;

    const performSearch = debounce(function(e) {
        const searchTerm = e.target.value.trim().toLowerCase();
        
        if (searchTerm.length < 2) {
            searchResults.style.display = 'none';
            return;
        }

        const filteredCustomers = availableCustomers.filter(customer => 
            customer.name.toLowerCase().includes(searchTerm) ||
            customer.mobile.includes(searchTerm)
        );

        displayCustomerSearchResults(filteredCustomers, searchResults);
    }, 300);

    nameInput.addEventListener('input', performSearch);
    mobileInput.addEventListener('input', performSearch); // Also search by mobile

    // Handle clicking outside to close results
    document.addEventListener('click', function(e) {
        if (!nameInput.contains(e.target) && !mobileInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.style.display = 'none';
        }
    });
}

function displayCustomerSearchResults(customers, resultsContainer) {
    if (customers.length === 0) {
        resultsContainer.innerHTML = '<div class="product-search-item">No matching customers found.</div>';
    } else {
        resultsContainer.innerHTML = customers.map(customer => `
            <div class="product-search-item customer-search-item" 
                 data-name="${customer.name}" 
                 data-mobile="${customer.mobile}" 
                 data-address="${customer.address}">
                <span class="product-search-name">${customer.name}</span>
                <span class="product-search-price">${customer.mobile}</span>
            </div>
        `).join('');

        // Add click event listeners
        resultsContainer.querySelectorAll('.customer-search-item').forEach(item => {
            item.addEventListener('click', function() {
                const name = this.getAttribute('data-name');
                const mobile = this.getAttribute('data-mobile');
                const address = this.getAttribute('data-address');
                
                // Fill form fields
                document.getElementById('customer-name').value = name;
                document.getElementById('customer-mobile').value = mobile;
                document.getElementById('customer-address').value = address;
                
                resultsContainer.style.display = 'none';
            });
        });
    }

    resultsContainer.style.display = 'block';
}

// ----------------------------------------------------
// Invoice Form Functionality
// ----------------------------------------------------

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

    // Initialize customer search (New)
    initCustomerSearch();
    
    // Initialize with one product row
    if (productsContainer.children.length === 0) {
        addProductRow();
    }
    
    // Display next invoice number
    displayNextInvoiceNumber();
    
    // Load available products for search - This is crucial
    loadAvailableProducts();

    // Load available customers for search (New)
    loadAvailableCustomers();
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
            showMessage('Invoice must have at least one product.', 'error');
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
    const customerAddress = document.getElementById('customer-address').value; // New Address Field
    
    if (!customerName || !customerMobile) {
        showMessage('Please fill in customer Name and Mobile.', 'error');
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
        customerAddress: customerAddress, // New Address Field
        products: products,
        subtotal: subtotal,
        gstAmount: gstAmount,
        grandTotal: grandTotal,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: user.uid,
        status: 'active'
    };
    
    // Save button loading state
    const saveBtn = e.target.querySelector('button[type="submit"]');
    if (saveBtn) showLoading(saveBtn);

    try {
        // Save to Firestore
        const docRef = await db.collection('invoices').add(invoice);
        
        // Update stock levels
        await updateProductStock(products);

        // Save/update customer record for auto-fill (optional)
        await saveCustomerRecord(customerName, customerMobile, customerAddress, user.uid);
        
        showMessage(`Invoice ${invoiceNumber} saved successfully!`, 'success');
        resetInvoiceForm();
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
            if (typeof showPage === 'function') {
                showPage('dashboard-page');
            }
           if (typeof loadDashboardData === 'function') {
                    setTimeout(loadDashboardData, 100);
            }
        }, 2000);
    } catch (error) {
        showMessage('Error saving invoice: ' + error.message, 'error');
    } finally {
        if (saveBtn) hideLoading(saveBtn);
    }
}

// Function to save/update customer in the 'customers' collection
async function saveCustomerRecord(name, mobile, address, userId) {
    try {
        const db = getDb();
        const user = getAuth().currentUser;

        // Try to find an existing customer by mobile
        const existingCustomerSnapshot = await db.collection('customers')
            .where('mobile', '==', mobile)
            .where('createdBy', '==', userId)
            .limit(1)
            .get();

        const customerData = {
            name: name,
            mobile: mobile,
            address: address,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: userId
        };

        if (!existingCustomerSnapshot.empty) {
            // Update existing record
            const docId = existingCustomerSnapshot.docs[0].id;
            await db.collection('customers').doc(docId).update(customerData);
            console.log('Existing customer record updated.');
        } else {
            // Create new record
            customerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('customers').add(customerData);
            console.log('New customer record created.');
        }
        
        // Refresh customer list cache for auto-fill
        if (typeof loadAvailableCustomers === 'function') {
            loadAvailableCustomers();
        }

    } catch (error) {
        console.error('Error saving customer record:', error);
        // Do not show an error message for failed customer save as it shouldn't block invoice creation
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
    
    // Clear customer search results container
    const searchResults = document.getElementById('customer-search-results');
    if (searchResults) {
        searchResults.style.display = 'none';
    }
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
        .get()
        .then((querySnapshot) => {
            // Filter client-side for stock > 0
            window.availableProducts = [];
            querySnapshot.forEach((doc) => {
                const product = doc.data();
                if (product.stock > 0) {
                    window.availableProducts.push({
                        id: doc.id,
                        ...product
                    });
                }
            });
            console.log(`Loaded ${window.availableProducts.length} available products for search (in stock).`);
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
        // Find the product in Firestore to get its current document reference and stock
        try {
            const productQuerySnapshot = await db.collection('products')
                .where('createdBy', '==', user.uid)
                .where('name', '==', product.name)
                .where('price', '==', product.price)
                .where('gst', '==', product.gst)
                .limit(1)
                .get();

            if (!productQuerySnapshot.empty) {
                const doc = productQuerySnapshot.docs[0];
                const availableProduct = doc.data();
                
                const newStock = (availableProduct.stock || 0) - product.quantity;
                const productRef = db.collection('products').doc(doc.id);
                
                if (newStock >= 0) {
                    batch.update(productRef, {
                        stock: newStock,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    console.warn(`Insufficient stock for ${product.name}`);
                    showMessage(`Warning: Insufficient stock for ${product.name}`, 'error');
                }
            } else {
                 console.warn(`Product not found in stock: ${product.name}`);
            }

        } catch (error) {
            console.error(`Error finding product ${product.name} for stock update:`, error);
        }
    }
    
    try {
        await batch.commit();
        console.log('Stock levels updated successfully');
    } catch (error) {
        console.error('Error committing stock update batch:', error);
    }
}

// Make this function globally accessible
window.loadAvailableProducts = loadAvailableProducts;

// --- INVOICE PREVIEW GENERATION (Modified for Settings Load) ---
/**
 * Wrapper function to ensure settings are loaded before generating preview.
 */
window.generateInvoicePreview = async function(invoice, invoiceId, isPreview = false) {
    // 1. Ensure settings are available
    if (!window.currentSettings && typeof loadSettings === 'function') {
        console.log('Settings are null. Attempting to load settings before generating preview.');
        // This is a crucial line to ensure the latest business details are pulled.
        // Since loadSettings is async, we call it, but need to ensure it finishes.
        // We'll wrap the inner logic in a try/catch, and let loadSettings populate the global.
        await loadSettings(); 
    }
    
    // 2. Define defaults and get settings (now guaranteed to be non-null or defaults)
    const defaults = {
        businessName: 'BILLA TRADERS',
        address: 'DICHPALLY RS, HYD-NZB ROAD, NIZAMABAD TELANGANA 503175',
        terms: '1. Goods once sold cannot be taken back. 2. Payment due within 30 days. 3. Disputes subject to Nizamabad jurisdiction.',
        gstin: 'N/A',
        pan: 'N/A'
    };
    const settings = window.currentSettings || defaults;
    
    const previewContent = document.getElementById('invoice-preview-content');
    if (!previewContent) return;
    
    // Format date
    let invoiceDate;
    if (invoice.createdAt) {
        if (typeof invoice.createdAt.toDate === 'function') {
            invoiceDate = invoice.createdAt.toDate().toLocaleDateString() || 'N/A';
        } else {
            invoiceDate = new Date(invoice.createdAt).toLocaleDateString() || 'N/A';
        }
    } else {
        invoiceDate = new Date().toLocaleDateString();
    }
    
    // Handle Address display
    const customerAddressHtml = invoice.customerAddress ? 
        invoice.customerAddress.replace(/\n/g, '<br>') : 
        'N/A';
    
    // Use invoice number if available, otherwise use ID
    const displayInvoiceNumber = invoice.invoiceNumber || invoiceId;
    
    const companyAddressHtml = settings.address ? settings.address.replace(/\n/g, '<br>') : 'N/A';
    const termsHtml = settings.terms ? settings.terms.replace(/\n/g, '<br>') : 'Terms not available.';

    // Generate products table rows
    let productsRows = '';
    if (invoice.products && invoice.products.length > 0) {
        invoice.products.forEach((product, index) => {
            // Calculation of prices without GST is assumed to be handled in the form/save process
            // For display, we calculate based on saved total and GST rate
            const totalInclGst = product.total;
            const priceNoGst = totalInclGst / (1 + (product.gst / 100));
            const totalGst = totalInclGst - (totalInclGst / (1 + (product.gst / 100)));

            productsRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td class="product-name-cell">${product.name}</td>
                    <td class="qty-cell">${product.quantity}</td>
                    <td class="price-cell">₹${(priceNoGst / product.quantity).toFixed(2)}</td>
                    <td class="gst-cell">${product.gst}%</td>
                    <td class="gst-amount-cell">₹${totalGst.toFixed(2)}</td>
                    <td class="total-cell">₹${totalInclGst.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    // Convert total to words
    const grandTotalInWords = convertNumberToWords(invoice.grandTotal.toFixed(2));
    
    previewContent.innerHTML = `
        <div class="invoice-paper-template">
            <!-- Professional Header -->
            <div class="invoice-header-print">
                <div class="company-logo-section">
                    <!-- Placeholder for Company Logo -->
                    <!-- <img src="favicon.png" alt="${settings.businessName} Logo" class="invoice-logo"> -->
                    <div class="company-name-print">${settings.businessName}</div>
                </div>
                <div class="company-address-section">
                    <p class="company-address">${companyAddressHtml}</p>
                    <p class="company-details">GSTIN: ${settings.gstin || 'N/A'} | PAN: ${settings.pan || 'N/A'}</p>
                </div>
            </div>
            
            <div class="document-title">TAX INVOICE</div>

            <!-- Invoice and Customer Details -->
            <div class="details-section">
                <div class="bill-to-info">
                    <h4>Bill To:</h4>
                    <p><strong>${invoice.customerName}</strong></p>
                    <p>Mobile: ${invoice.customerMobile}</p>
                    <p>Address: ${customerAddressHtml}</p>
                </div>
                <div class="invoice-meta-info">
                    <div class="meta-row"><strong>Invoice No:</strong> <span>${displayInvoiceNumber}</span></div>
                    <div class="meta-row"><strong>Date:</strong> <span>${invoiceDate}</span></div>
                    <div class="meta-row"><strong>Status:</strong> <span>${invoice.status}</span></div>
                    <div class="meta-row"><strong>Payment:</strong> <span>Pending/Cash</span></div>
                </div>
            </div>
            
            <!-- Products Table -->
            <table class="products-table-print">
                <thead>
                    <tr>
                        <th style="width: 5%;">#</th>
                        <th style="width: 35%;">Product/Service</th>
                        <th style="width: 10%;">Qty</th>
                        <th style="width: 15%;">Unit Price (Excl. GST)</th>
                        <th style="width: 10%;">GST %</th>
                        <th style="width: 15%;">GST Amount</th>
                        <th style="width: 10%;">Total (Incl. GST)</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsRows}
                </tbody>
            </table>
            
            <!-- Totals and Signature Section -->
            <div class="summary-section">
                <div class="amount-in-words">
                    <p><strong>Amount in Words:</strong> Rupees ${grandTotalInWords} only</p>
                </div>
                <div class="totals-preview-print">
                    <div class="totals-row">
                        <span class="label">Subtotal (Excl. GST):</span>
                        <span class="value">₹${(invoice.grandTotal - invoice.gstAmount).toFixed(2)}</span>
                    </div>
                    <div class="totals-row">
                        <span class="label">Total GST:</span>
                        <span class="value">₹${invoice.gstAmount.toFixed(2)}</span>
                    </div>
                    <div class="totals-row grand-total-row">
                        <span class="label">Grand Total:</span>
                        <span class="value">₹${invoice.grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            <!-- Footer and Signature -->
            <div class="invoice-footer-print">
                <div class="terms-conditions">
                    <p><strong>Terms & Conditions:</strong></p>
                    <p>${termsHtml}</p>
                </div>
                <div class="signature-section">
                    <p>For ${settings.businessName}</p>
                    <div class="signature-line"></div>
                    <p>(Authorized Signatory)</p>
                </div>
            </div>
        </div>
    `;
};

// Simple function to convert number to words for invoice aesthetic (Copied from app.js)
function convertNumberToWords(amount) {
    if (typeof amount === 'string') {
        amount = parseFloat(amount);
    }
    if (isNaN(amount) || amount === 0) {
        return "Zero";
    }
    
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    function convertGroup(n) {
        let output = '';
        if (n >= 100) {
            output += units[Math.floor(n / 100)] + ' Hundred ';
            n %= 100;
        }
        if (n >= 10 && n <= 19) {
            output += teens[n - 10];
        } else if (n >= 20) {
            output += tens[Math.floor(n / 10)] + (n % 10 > 0 ? ' ' + units[n % 10] : '');
        } else if (n > 0) {
            output += units[n % 10];
        }
        return output.trim();
    }

    let wholePart = Math.floor(amount);
    let decimalPart = Math.round((amount - wholePart) * 100);
    let result = '';

    let crores = Math.floor(wholePart / 10000000);
    wholePart %= 10000000;

    let lakhs = Math.floor(wholePart / 100000);
    wholePart %= 100000;

    let thousands = Math.floor(wholePart / 1000);
    wholePart %= 1000;

    let remainder = wholePart;
    
    if (crores > 0) {
        result += convertGroup(crores) + ' Crore ';
    }
    if (lakhs > 0) {
        result += convertGroup(lakhs) + ' Lakh ';
    }
    if (thousands > 0) {
        result += convertGroup(thousands) + ' Thousand ';
    }
    if (remainder > 0) {
        result += convertGroup(remainder);
    }
    
    if (result.trim() === '') {
        result = 'Zero';
    }
    
    if (decimalPart > 0) {
        result += ' and ' + convertGroup(decimalPart) + ' Paisa';
    } else {
        // Ensure "only" is added if no cents
        result += ' ';
    }

    return result.trim().replace(/\s+/g, ' '); // Clean up multiple spaces
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
        previewBtn.addEventListener('click', async function() {
            // Validate form before preview
            const customerName = document.getElementById('customer-name').value;
            const customerMobile = document.getElementById('customer-mobile').value;
            const customerAddress = document.getElementById('customer-address').value;
            
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
                customerAddress: customerAddress,
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
            
            // Use the ASYNC version of generateInvoicePreview
            await generateInvoicePreview(tempInvoice, 'PREVIEW');
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
        // Re-initialize customer list when switching to invoice page
        if (typeof loadAvailableCustomers === 'function') {
            loadAvailableCustomers();
        }
    }
});
