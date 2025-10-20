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

// Generate invoice preview HTML - Updated for better print
function generateInvoicePreview(invoice, invoiceId) {
    const previewContent = document.getElementById('invoice-preview-content');
    
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
    
    // Generate products table rows
    let productsRows = '';
    let serialNumber = 1;
    invoice.products.forEach((product) => {
        // Only add product if it has a name
        if (product.name && product.name.trim() !== '') {
            productsRows += `
                <tr>
                    <td style="text-align: center;">${serialNumber}</td>
                    <td>${product.name}</td>
                    <td style="text-align: center;">${product.quantity}</td>
                    <td style="text-align: right;">₹${product.price.toFixed(2)}</td>
                    <td style="text-align: center;">${product.gst}%</td>
                    <td style="text-align: right;">₹${product.total.toFixed(2)}</td>
                </tr>
            `;
            serialNumber++;
        }
    });
    
    previewContent.innerHTML = `
        <div class="invoice-preview-content" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
            <!-- Header Section -->
            <div class="invoice-header-preview" style="display: flex; justify-content: space-between; margin-bottom: 30px; padding-bottom: 15px; border-bottom: 2px solid #000;">
                <div class="company-info">
                    <h2 style="color: #000; margin: 0 0 5px 0; font-size: 24px; font-weight: bold;">SHIVAM INDANE GAS</h2>
                    <p style="margin: 2px 0; font-size: 14px;">Professional Gas Services</p>
                    <p style="margin: 2px 0; font-size: 14px;">123 Business Street, City, State 12345</p>
                    <p style="margin: 2px 0; font-size: 14px;">Phone: +91 98765 43210 | Email: info@shivamindanegas.com</p>
                </div>
                <div class="invoice-meta">
                    <h3 style="color: #000; margin: 0 0 10px 0; font-size: 20px; font-weight: bold;">INVOICE</h3>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Invoice #:</strong> ${invoiceId}</p>
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Date:</strong> ${invoiceDate}</p>
                </div>
            </div>
            
            <!-- Customer Information -->
            <div class="customer-info-preview" style="margin-bottom: 25px;">
                <h4 style="color: #000; margin-bottom: 10px; font-size: 16px; font-weight: bold;">Bill To:</h4>
                <p style="margin: 5px 0; font-size: 14px;"><strong>${invoice.customerName}</strong></p>
                <p style="margin: 5px 0; font-size: 14px;">Mobile: ${invoice.customerMobile}</p>
            </div>
            
            <!-- Products Table -->
            <table class="products-table" style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 14px;">
                <thead>
                    <tr>
                        <th style="border: 1px solid #000; padding: 10px; text-align: center; background: #f8f9fa;">#</th>
                        <th style="border: 1px solid #000; padding: 10px; text-align: left; background: #f8f9fa;">Product/Service</th>
                        <th style="border: 1px solid #000; padding: 10px; text-align: center; background: #f8f9fa;">Quantity</th>
                        <th style="border: 1px solid #000; padding: 10px; text-align: right; background: #f8f9fa;">Price</th>
                        <th style="border: 1px solid #000; padding: 10px; text-align: center; background: #f8f9fa;">GST %</th>
                        <th style="border: 1px solid #000; padding: 10px; text-align: right; background: #f8f9fa;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsRows}
                </tbody>
            </table>
            
            <!-- Totals Section -->
            <div class="totals-preview" style="width: 300px; margin-left: auto; background: #f8f9fa; padding: 15px; border: 1px solid #000;">
                <div class="totals-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>Subtotal:</span>
                    <span>₹${invoice.subtotal.toFixed(2)}</span>
                </div>
                <div class="totals-row" style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <span>GST Total:</span>
                    <span>₹${invoice.gstAmount.toFixed(2)}</span>
                </div>
                <div class="totals-row total" style="display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 8px; margin-top: 8px;">
                    <span>Grand Total:</span>
                    <span>₹${invoice.grandTotal.toFixed(2)}</span>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="invoice-footer" style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; text-align: center;">
                <p style="margin: 5px 0; font-size: 14px;">Thank you for your business!</p>
                <p style="margin: 5px 0; font-size: 12px; color: #666;">Terms: Payment due within 30 days</p>
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
    
   // Print invoice from preview - Updated
document.getElementById('print-invoice-btn').addEventListener('click', function() {
    // Use the new reliable print function
    if (currentInvoiceToPrint) {
        printInvoice(currentInvoiceToPrint);
    } else {
        // Fallback to window.print() if no specific invoice
        window.print();
    }
});

// Reliable print function that opens new window
function printInvoice(invoiceId) {
    db.collection('invoices').doc(invoiceId).get()
        .then((doc) => {
            if (doc.exists) {
                const invoice = doc.data();
                
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
                
                // Generate products table rows
                let productsRows = '';
                let serialNumber = 1;
                let totalQuantity = 0;
                
                invoice.products.forEach((product) => {
                    if (product.name && product.name.trim() !== '') {
                        productsRows += `
                            <tr>
                                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${serialNumber}</td>
                                <td style="border: 1px solid #000; padding: 8px;">${product.name}</td>
                                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${product.quantity}</td>
                                <td style="text-align: right; border: 1px solid #000; padding: 8px;">₹${product.price.toFixed(2)}</td>
                                <td style="text-align: center; border: 1px solid #000; padding: 8px;">${product.gst}%</td>
                                <td style="text-align: right; border: 1px solid #000; padding: 8px;">₹${product.total.toFixed(2)}</td>
                            </tr>
                        `;
                        serialNumber++;
                        totalQuantity += product.quantity || 0;
                    }
                });
                
                // Create print window
                const printWindow = window.open('', '_blank', 'width=800,height=600');
                
                printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Invoice - SHIVAM INDANE GAS</title>
                        <style>
                            @media print {
                                body { 
                                    margin: 0; 
                                    padding: 15px;
                                    font-family: Arial, sans-serif;
                                    color: #000;
                                    background: white;
                                }
                                .no-print { display: none !important; }
                                .page-break { page-break-after: always; }
                            }
                            @media screen {
                                body { 
                                    margin: 20px; 
                                    font-family: Arial, sans-serif;
                                }
                            }
                            .invoice-container { 
                                max-width: 800px; 
                                margin: 0 auto; 
                                background: white;
                            }
                            .header { 
                                display: flex; 
                                justify-content: space-between; 
                                margin-bottom: 30px; 
                                padding-bottom: 15px; 
                                border-bottom: 2px solid #000; 
                            }
                            .company-info h2 { 
                                margin: 0 0 5px 0; 
                                font-size: 24px; 
                                color: #000;
                            }
                            .invoice-meta { 
                                text-align: right; 
                            }
                            .invoice-meta h3 { 
                                margin: 0 0 10px 0; 
                                font-size: 20px; 
                                color: #000;
                            }
                            table { 
                                width: 100%; 
                                border-collapse: collapse; 
                                margin: 20px 0; 
                                font-size: 14px;
                            }
                            th, td { 
                                border: 1px solid #000; 
                                padding: 10px; 
                            }
                            th { 
                                background: #f8f8f8; 
                                font-weight: bold; 
                                text-align: left;
                            }
                            .totals { 
                                width: 300px; 
                                margin-left: auto; 
                                background: #f8f8f8; 
                                padding: 15px; 
                                border: 1px solid #000; 
                            }
                            .totals-row { 
                                display: flex; 
                                justify-content: space-between; 
                                margin-bottom: 8px; 
                            }
                            .total { 
                                font-weight: bold; 
                                font-size: 16px; 
                                border-top: 2px solid #000; 
                                padding-top: 8px; 
                                margin-top: 8px; 
                            }
                            .footer { 
                                margin-top: 40px; 
                                text-align: center; 
                                padding-top: 15px;
                                border-top: 1px solid #ccc;
                            }
                            .print-btn { 
                                padding: 10px 20px; 
                                background: #007bff; 
                                color: white; 
                                border: none; 
                                border-radius: 4px; 
                                cursor: pointer; 
                                margin: 10px 5px;
                            }
                            .close-btn { 
                                padding: 10px 20px; 
                                background: #6c757d; 
                                color: white; 
                                border: none; 
                                border-radius: 4px; 
                                cursor: pointer; 
                                margin: 10px 5px;
                            }
                            .button-container {
                                text-align: center;
                                margin-top: 20px;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="invoice-container">
                            <!-- Header -->
                            <div class="header">
                                <div class="company-info">
                                    <h2>SHIVAM INDANE GAS</h2>
                                    <p><strong>Professional Gas Services</strong></p>
                                    <p>123 Business Street, City, State 12345</p>
                                    <p>Phone: +91 98765 43210 | Email: info@shivamindanegas.com</p>
                                </div>
                                <div class="invoice-meta">
                                    <h3>INVOICE</h3>
                                    <p><strong>Invoice #:</strong> ${invoiceId}</p>
                                    <p><strong>Date:</strong> ${invoiceDate}</p>
                                </div>
                            </div>
                            
                            <!-- Customer Information -->
                            <div class="customer-info">
                                <h4 style="margin-bottom: 10px;">Bill To:</h4>
                                <p style="margin: 5px 0;"><strong>${invoice.customerName}</strong></p>
                                <p style="margin: 5px 0;">Mobile: ${invoice.customerMobile}</p>
                            </div>
                            
                            <!-- Products Table -->
                            <table>
                                <thead>
                                    <tr>
                                        <th style="width: 5%;">#</th>
                                        <th style="width: 35%;">Product/Service</th>
                                        <th style="width: 10%; text-align: center;">Qty</th>
                                        <th style="width: 15%; text-align: right;">Price (₹)</th>
                                        <th style="width: 10%; text-align: center;">GST %</th>
                                        <th style="width: 15%; text-align: right;">Total (₹)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${productsRows}
                                </tbody>
                            </table>
                            
                            <!-- Totals Section -->
                            <div class="totals">
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
                            
                            <!-- Footer -->
                            <div class="footer">
                                <p><strong>Thank you for your business!</strong></p>
                                <p>Terms: Payment due within 30 days</p>
                            </div>
                            
                            <!-- Print Buttons (hidden when printing) -->
                            <div class="button-container no-print">
                                <button class="print-btn" onclick="window.print()">🖨️ Print Invoice</button>
                                <button class="close-btn" onclick="window.close()">✕ Close Window</button>
                            </div>
                        </div>
                        
                        <script>
                            // Auto-print after a short delay
                            setTimeout(() => {
                                window.print();
                            }, 500);
                        </script>
                    </body>
                    </html>
                `);
                
                printWindow.document.close();
                
            } else {
                showMessage('Invoice not found', 'error');
            }
        })
        .catch((error) => {
            showMessage('Error loading invoice: ' + error.message, 'error');
        });
   }
});
