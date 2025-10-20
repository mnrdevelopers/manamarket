// Invoice Management Functions
// Invoice Number Generation System
let lastInvoiceNumber = 0;
let currentYear = new Date().getFullYear();

// Generate professional invoice number
function generateInvoiceNumber() {
    const user = auth.currentUser;
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
    // Add product row
    document.getElementById('add-product-btn').addEventListener('click', addProductRow);
    
    // Calculate totals when inputs change
    document.getElementById('products-container').addEventListener('input', calculateTotals);
    
    // Handle form submission
    document.getElementById('invoice-form').addEventListener('submit', saveInvoice);
    
    // Initialize with one product row
    addProductRow();
    
    // Display next invoice number
    displayNextInvoiceNumber();
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
    document.getElementById('subtotal-amount').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('gst-amount').textContent = `₹${gstTotal.toFixed(2)}`;
    document.getElementById('grand-total').textContent = `₹${grandTotal.toFixed(2)}`;
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
    
    // Get products
    const products = [];
    const productRows = document.querySelectorAll('.product-row');
    
    productRows.forEach(row => {
        const productName = row.querySelector('.product-name').value;
        const quantity = parseFloat(row.querySelector('.product-quantity').value);
        const price = parseFloat(row.querySelector('.product-price').value);
        const gst = parseFloat(row.querySelector('.product-gst').value);
        const total = parseFloat(row.querySelector('.product-total').value.replace('₹', ''));
        
        products.push({
            name: productName,
            quantity: quantity,
            price: price,
            gst: gst,
            total: total
        });
    });
    
    // Calculate totals
    const subtotal = parseFloat(document.getElementById('subtotal-amount').textContent.replace('₹', ''));
    const gstAmount = parseFloat(document.getElementById('gst-amount').textContent.replace('₹', ''));
    const grandTotal = parseFloat(document.getElementById('grand-total').textContent.replace('₹', ''));
    
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
    
    // Save to Firestore
    db.collection('invoices').add(invoice)
        .then((docRef) => {
            showMessage(`Invoice ${invoiceNumber} saved successfully!`, 'success');
            resetInvoiceForm();
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                showPage('dashboard-page');
                loadDashboardData();
            }, 2000);
        })
        .catch((error) => {
            showMessage('Error saving invoice: ' + error.message, 'error');
        });
}

// Reset invoice form
function resetInvoiceForm() {
    document.getElementById('invoice-form').reset();
    
    // Remove all but one product row
    const productRows = document.querySelectorAll('.product-row');
    for (let i = 1; i < productRows.length; i++) {
        productRows[i].remove();
    }
    
    // Reset the first product row
    const firstRow = document.querySelector('.product-row');
    firstRow.querySelector('.product-name').value = '';
    firstRow.querySelector('.product-quantity').value = '1';
    firstRow.querySelector('.product-price').value = '';
    firstRow.querySelector('.product-gst').value = '18';
    firstRow.querySelector('.product-total').value = '';
    
    // Reset totals
    calculateTotals();
}

// Load recent invoices for dashboard
function loadRecentInvoices() {
    const user = auth.currentUser;
    if (!user) return;

    const invoicesList = document.getElementById('invoices-list');
    invoicesList.innerHTML = '<p>Loading invoices...</p>';

    db.collection('invoices')
        .where('createdBy', '==', user.uid)
        .get()
        .then((querySnapshot) => {
            invoicesList.innerHTML = '';
            
            if (querySnapshot.empty) {
                invoicesList.innerHTML = '<p class="no-invoices">No invoices found. Create your first invoice!</p>';
                return;
            }

            // Convert to array and sort by date locally
            const invoices = [];
            querySnapshot.forEach((doc) => {
                invoices.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort by date (newest first)
            invoices.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            // Show only last 10 invoices
            const recentInvoices = invoices.slice(0, 10);

            recentInvoices.forEach((invoice) => {
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

            // Add event listeners to view and print buttons
            document.querySelectorAll('.view-invoice-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const invoiceId = this.getAttribute('data-id');
                    viewInvoice(invoiceId);
                });
            });
            
            document.querySelectorAll('.print-invoice-btn').forEach(button => {
                button.addEventListener('click', function() {
                    const invoiceId = this.getAttribute('data-id');
                    printInvoice(invoiceId);
                });
            });
        })
        .catch((error) => {
            invoicesList.innerHTML = '<p class="error">Error loading invoices</p>';
            console.error('Error loading invoices:', error);
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

// Print invoice with compact layout
function printInvoice(invoiceId) {
    db.collection('invoices').doc(invoiceId).get()
        .then((doc) => {
            if (doc.exists) {
                generateInvoicePreview(doc.data(), doc.id);
                
                // Wait for the preview to render, then print
                setTimeout(() => {
                    // Ensure modal is visible for printing
                    document.getElementById('invoice-preview-modal').classList.remove('hidden');
                    
                    // Small delay to ensure rendering, then print
                    setTimeout(() => {
                        window.print();
                    }, 100);
                }, 500);
            } else {
                showMessage('Invoice not found', 'error');
            }
        })
        .catch((error) => {
            showMessage('Error loading invoice: ' + error.message, 'error');
        });
}

// Generate compact invoice preview based on example
function generateInvoicePreview(invoice, invoiceId, isPreview = false) {
    const previewContent = document.getElementById('invoice-preview-content');
    
    // Format dates
    let invoiceDate;
    let dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from now
    
    if (invoice.createdAt) {
        if (typeof invoice.createdAt.toDate === 'function') {
            invoiceDate = invoice.createdAt.toDate();
        } else {
            invoiceDate = new Date(invoice.createdAt);
        }
    } else {
        invoiceDate = new Date();
    }
    
    const formattedInvoiceDate = invoiceDate.toLocaleDateString();
    const formattedDueDate = dueDate.toLocaleDateString();
    
    // Use invoice number if available, otherwise use ID
    const displayInvoiceNumber = invoice.invoiceNumber || invoiceId;
    const customerId = invoice.customerMobile || 'N/A';
    
    // Generate products rows
    let productsRows = '';
    invoice.products.forEach((product, index) => {
        productsRows += `
            <tr>
                <td>${product.name}</td>
                <td>${product.gst}%</td>
                <td>₹${product.total.toFixed(2)}</td>
            </tr>
        `;
    });
    
    previewContent.innerHTML = `
        <div class="invoice-preview-content compact-invoice">
            <!-- Company Header -->
            <div class="company-header">
                <div class="company-name">SHIVAM INDANE GAS</div>
                <div class="company-address">
                    Professional Gas Services<br>
                    City, State 12345<br>
                    Phone: +91 98765 43210
                </div>
            </div>
            
            <div class="invoice-layout">
                <!-- Left Column - Bill To -->
                <div class="bill-to-section">
                    <div class="section-title">BILL TO</div>
                    <div class="customer-details">
                        <strong>${invoice.customerName}</strong><br>
                        Mobile: ${invoice.customerMobile}
                    </div>
                </div>
                
                <!-- Right Column - Invoice Details -->
                <div class="invoice-details-section">
                    <div class="section-title">INVOICE</div>
                    <table class="invoice-meta-table">
                        <tr>
                            <td>DATE</td>
                            <td>${formattedInvoiceDate}</td>
                        </tr>
                        <tr>
                            <td>INVOICE #</td>
                            <td>${displayInvoiceNumber}</td>
                        </tr>
                        <tr>
                            <td>CUSTOMER ID</td>
                            <td>${customerId}</td>
                        </tr>
                        <tr>
                            <td>DUE DATE</td>
                            <td>${formattedDueDate}</td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <!-- Products Table -->
            <table class="compact-products-table">
                <thead>
                    <tr>
                        <th>DESCRIPTION</th>
                        <th>GST</th>
                        <th>AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsRows}
                </tbody>
            </table>
            
            <!-- Totals Section -->
            <div class="totals-section">
                <table class="totals-table">
                    <tr>
                        <td>Subtotal</td>
                        <td>₹${invoice.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>GST Total</td>
                        <td>₹${invoice.gstAmount.toFixed(2)}</td>
                    </tr>
                    <tr class="grand-total">
                        <td><strong>TOTAL</strong></td>
                        <td><strong>₹${invoice.grandTotal.toFixed(2)}</strong></td>
                    </tr>
                </table>
            </div>
            
            <!-- Footer Section -->
            <div class="invoice-footer-compact">
                <div class="payment-instructions">
                    <strong>Make all checks payable to:</strong><br>
                    SHIVAM INDANE GAS
                </div>
                
                <div class="comments-section">
                    <strong>OTHER COMMENTS</strong><br>
                    1. Total payment due in 30 days.<br>
                    2. Please include invoice number with payment.
                </div>
                
                <div class="contact-info">
                    <strong>Questions?</strong><br>
                    Contact: +91 98765 43210<br>
                    Thank You For Your Business!
                </div>
            </div>
        </div>
    `;
}

// Initialize invoice functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initInvoiceForm();
    
    // Setup invoice preview modal
    document.getElementById('preview-invoice-btn').addEventListener('click', function() {
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
    
    // Close preview modal
    document.getElementById('close-preview').addEventListener('click', function() {
        document.getElementById('invoice-preview-modal').classList.add('hidden');
    });
    
    document.getElementById('close-preview-btn').addEventListener('click', function() {
        document.getElementById('invoice-preview-modal').classList.add('hidden');
    });
    
    // Print invoice from preview
    document.getElementById('print-invoice-btn').addEventListener('click', function() {
        window.print();
    });
});
