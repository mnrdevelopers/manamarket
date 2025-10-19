// Invoice Management Functions

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
    const quantity = parseFloat(productRow.querySelector('.product-quantity').value) || 0;
    const price = parseFloat(productRow.querySelector('.product-price').value) || 0;
    const gstPercent = parseFloat(productRow.querySelector('.product-gst').value) || 0;
    
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
function saveInvoice(e) {
    e.preventDefault();
    
    const user = auth.currentUser;
    if (!user) {
        showMessage('Please log in to save invoices', 'error');
        return;
    }
    
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
    
    // Create invoice object
    const invoice = {
        customerName: customerName,
        customerMobile: customerMobile,
        products: products,
        subtotal: subtotal,
        gstAmount: gstAmount,
        grandTotal: grandTotal,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: user.uid
    };
    
    // Save to Firestore
    db.collection('invoices').add(invoice)
        .then((docRef) => {
            showMessage('Invoice saved successfully!', 'success');
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
                        <button class="btn-primary print-invoice-btn" data-id="${invoice.id}">Print</button>
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

// Generate invoice preview HTML
function generateInvoicePreview(invoice, invoiceId) {
    const previewContent = document.getElementById('invoice-preview-content');
    
    // Format date
    const invoiceDate = invoice.createdAt ? 
        invoice.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString();
    
    // Generate products table rows
    let productsRows = '';
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
    
    previewContent.innerHTML = `
        <div class="invoice-preview-content">
            <div class="invoice-header-preview">
                <div class="company-info">
                    <h2>I DANE GAS</h2>
                    <p>Professional Gas Services</p>
                    <p>123 Business Street, City, State 12345</p>
                    <p>Phone: +91 98765 43210 | Email: info@idanegas.com</p>
                </div>
                <div class="invoice-meta">
                    <h3>INVOICE</h3>
                    <p><strong>Invoice #:</strong> ${invoiceId}</p>
                    <p><strong>Date:</strong> ${invoiceDate}</p>
                </div>
            </div>
            
            <div class="invoice-details">
                <div class="customer-info-preview">
                    <h4>Bill To:</h4>
                    <p><strong>${invoice.customerName}</strong></p>
                    <p>Mobile: ${invoice.customerMobile}</p>
                </div>
                
                <table class="products-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Product/Service</th>
                            <th>Quantity</th>
                            <th>Price</th>
                            <th>GST %</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsRows}
                    </tbody>
                </table>
                
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
            </div>
            
            <div class="invoice-footer">
                <p>Thank you for your business!</p>
                <p>Terms: Payment due within 30 days</p>
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
        
        // Create a temporary invoice object for preview
        const tempInvoice = {
            customerName: customerName,
            customerMobile: customerMobile,
            products: [],
            subtotal: parseFloat(document.getElementById('subtotal-amount').textContent.replace('₹', '')),
            gstAmount: parseFloat(document.getElementById('gst-amount').textContent.replace('₹', '')),
            grandTotal: parseFloat(document.getElementById('grand-total').textContent.replace('₹', '')),
            createdAt: new Date()
        };
        
        // Get products from form
        const productRows = document.querySelectorAll('.product-row');
        productRows.forEach(row => {
            const productName = row.querySelector('.product-name').value;
            const quantity = parseFloat(row.querySelector('.product-quantity').value);
            const price = parseFloat(row.querySelector('.product-price').value);
            const gst = parseFloat(row.querySelector('.product-gst').value);
            const total = parseFloat(row.querySelector('.product-total').value.replace('₹', ''));
            
            tempInvoice.products.push({
                name: productName,
                quantity: quantity,
                price: price,
                gst: gst,
                total: total
            });
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
