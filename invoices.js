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

// Invoices Management with CRUD Operations

let currentInvoices = [];
let currentPage = 1;
const invoicesPerPage = 10;
let currentInvoiceToDelete = null;

// Initialize invoices page
function initInvoicesPage() {
    console.log('Initializing invoices page...');
    
    // Load invoices
    loadAllInvoices();
    
    // Setup event listeners
    setupInvoicesEventListeners();
}

// Setup event listeners for invoices page
function setupInvoicesEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('search-invoices');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function(e) {
            filterInvoices(e.target.value);
        }, 300));
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refresh-invoices');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadAllInvoices);
    }
    
    // Pagination
    const prevPageBtn = document.getElementById('prev-page');
    const nextPageBtn = document.getElementById('next-page');
    
    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', goToPreviousPage);
    }
    
    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', goToNextPage);
    }

    // Add this line:
    setupEditModalListeners();
    
    // Delete confirmation modal
    const closeDeleteModal = document.getElementById('close-delete-modal');
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    
    if (closeDeleteModal) {
        closeDeleteModal.addEventListener('click', closeDeleteModalHandler);
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteModalHandler);
    }
    
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', confirmDeleteInvoice);
    }
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

// Load all invoices for the current user
function loadAllInvoices() {
    const user = getAuth().currentUser;
    if (!user) {
        showMessage('Please log in to view invoices', 'error');
        return;
    }

    const tableBody = document.getElementById('invoices-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="6" class="loading-invoices">Loading invoices...</td></tr>';

    db.collection('invoices')
        .where('createdBy', '==', user.uid)
        .get()
        .then((querySnapshot) => {
            currentInvoices = [];
            
            querySnapshot.forEach((doc) => {
                currentInvoices.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            // Sort by date (newest first)
            currentInvoices.sort((a, b) => {
                const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
                const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
                return dateB - dateA;
            });

            console.log(`Loaded ${currentInvoices.length} invoices`);
            displayInvoicesTable();
        })
        .catch((error) => {
            console.error('Error loading invoices:', error);
            tableBody.innerHTML = '<tr><td colspan="6" class="no-invoices-found">Error loading invoices</td></tr>';
            showMessage('Error loading invoices: ' + error.message, 'error');
        });
}

// Display invoices in the table with pagination
function displayInvoicesTable(filteredInvoices = null) {
    const invoicesToDisplay = filteredInvoices || currentInvoices;
    const tableBody = document.getElementById('invoices-table-body');
    
    if (!tableBody) return;

    if (invoicesToDisplay.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="no-invoices-found">No invoices found</td></tr>';
        updatePagination(0);
        return;
    }

    // Calculate pagination
    const totalPages = Math.ceil(invoicesToDisplay.length / invoicesPerPage);
    const startIndex = (currentPage - 1) * invoicesPerPage;
    const endIndex = startIndex + invoicesPerPage;
    const pageInvoices = invoicesToDisplay.slice(startIndex, endIndex);

    let tableHTML = '';

    pageInvoices.forEach((invoice) => {
        const invoiceDate = invoice.createdAt ? 
            invoice.createdAt.toDate().toLocaleDateString() : 'Date not available';
        
        const invoiceNumber = invoice.invoiceNumber || invoice.id.substring(0, 8) + '...';
        
tableHTML += `
    <tr>
        <td>
            <div class="invoice-number-simple">
                <span class="invoice-number">${invoiceNumber}</span>
            </div>
        </td>
        <td>${invoice.customerName}</td>
        <td>${invoice.customerMobile}</td>
        <td>${invoiceDate}</td>
        <td class="amount-cell">₹${invoice.grandTotal.toFixed(2)}</td>
        <td class="invoice-actions-cell">
            <button class="btn-view view-invoice-details" data-id="${invoice.id}">
                <i class="fas fa-eye"></i> View
            </button>
            <button class="btn-edit edit-invoice" data-id="${invoice.id}">
                <i class="fas fa-edit"></i> Edit
            </button>
            <button class="btn-delete delete-invoice" data-id="${invoice.id}">
                <i class="fas fa-trash"></i> Delete
            </button>
        </td>
    </tr>
`;
    });

    tableBody.innerHTML = tableHTML;

    // Add event listeners to action buttons
    document.querySelectorAll('.view-invoice-details').forEach(button => {
        button.addEventListener('click', function() {
            const invoiceId = this.getAttribute('data-id');
            viewInvoice(invoiceId);
        });
    });

    document.querySelectorAll('.edit-invoice').forEach(button => {
        button.addEventListener('click', function() {
            const invoiceId = this.getAttribute('data-id');
            editInvoice(invoiceId);
        });
    });

    document.querySelectorAll('.delete-invoice').forEach(button => {
        button.addEventListener('click', function() {
            const invoiceId = this.getAttribute('data-id');
            showDeleteConfirmation(invoiceId);
        });
    });

    updatePagination(invoicesToDisplay.length, totalPages);
}

// Filter invoices based on search term
function filterInvoices(searchTerm) {
    if (!searchTerm.trim()) {
        currentPage = 1;
        displayInvoicesTable();
        return;
    }

    const filteredInvoices = currentInvoices.filter(invoice => 
        invoice.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.customerMobile.includes(searchTerm) ||
        invoice.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    currentPage = 1;
    displayInvoicesTable(filteredInvoices);
}

// Pagination functions
function goToPreviousPage() {
    if (currentPage > 1) {
        currentPage--;
        displayInvoicesTable();
    }
}

function goToNextPage() {
    const totalPages = Math.ceil(currentInvoices.length / invoicesPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        displayInvoicesTable();
    }
}

function updatePagination(totalInvoices, totalPages = null) {
    const totalPagesCalc = totalPages || Math.ceil(totalInvoices / invoicesPerPage);
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');

    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPagesCalc}`;
    }

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }

    if (nextBtn) {
        nextBtn.disabled = currentPage === totalPagesCalc;
    }
}

// Show delete confirmation modal
function showDeleteConfirmation(invoiceId) {
    const invoice = currentInvoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    currentInvoiceToDelete = invoiceId;

    document.getElementById('delete-invoice-id').textContent = invoiceId.substring(0, 8) + '...';
    document.getElementById('delete-customer-name').textContent = invoice.customerName;
    document.getElementById('delete-confirm-modal').classList.remove('hidden');
}

// Close delete confirmation modal
function closeDeleteModalHandler() {
    document.getElementById('delete-confirm-modal').classList.add('hidden');
    currentInvoiceToDelete = null;
}

// Confirm and delete invoice
function confirmDeleteInvoice() {
    if (!currentInvoiceToDelete) return;

    db.collection('invoices').doc(currentInvoiceToDelete).delete()
        .then(() => {
            showMessage('Invoice deleted successfully!', 'success');
            closeDeleteModalHandler();
            loadAllInvoices(); // Reload the list
        })
        .catch((error) => {
            showMessage('Error deleting invoice: ' + error.message, 'error');
            console.error('Error deleting invoice:', error);
        });
}

// Edit invoice - load data into edit form
function editInvoice(invoiceId) {
    console.log('Editing invoice:', invoiceId);
    
    db.collection('invoices').doc(invoiceId).get()
        .then((doc) => {
            if (doc.exists) {
                const invoice = doc.data();
                loadInvoiceIntoEditForm(invoice, doc.id);
                document.getElementById('edit-invoice-modal').classList.remove('hidden');
            } else {
                showMessage('Invoice not found', 'error');
            }
        })
        .catch((error) => {
            showMessage('Error loading invoice: ' + error.message, 'error');
            console.error('Error loading invoice:', error);
        });
}

// Load invoice data into edit form
function loadInvoiceIntoEditForm(invoice, invoiceId) {
    // Store the invoice ID for updating
    document.getElementById('edit-invoice-form').dataset.invoiceId = invoiceId;
    
    // Set customer details
    document.getElementById('edit-customer-name').value = invoice.customerName || '';
    document.getElementById('edit-customer-mobile').value = invoice.customerMobile || '';
    
    // Clear existing products
    const productsContainer = document.getElementById('edit-products-container');
    productsContainer.innerHTML = '';
    
    // Add products
    if (invoice.products && invoice.products.length > 0) {
        invoice.products.forEach((product, index) => {
            addEditProductRow(product);
        });
    } else {
        addEditProductRow();
    }
    
    // Update totals
    updateEditTotals(invoice.subtotal, invoice.gstAmount, invoice.grandTotal);
}

// Add product row to edit form
function addEditProductRow(product = null) {
    const productsContainer = document.getElementById('edit-products-container');
    const productRow = document.createElement('div');
    productRow.className = 'product-row';
    
    productRow.innerHTML = `
        <div class="form-group">
            <label>Product Name</label>
            <input type="text" class="edit-product-name" value="${product ? product.name : ''}" required>
        </div>
        <div class="form-group">
            <label>Quantity</label>
            <input type="number" class="edit-product-quantity" min="1" value="${product ? product.quantity : 1}" required>
        </div>
        <div class="form-group">
            <label>Price (₹)</label>
            <input type="number" class="edit-product-price" min="0" step="0.01" value="${product ? product.price : ''}" required>
        </div>
        <div class="form-group">
            <label>GST (%)</label>
            <input type="number" class="edit-product-gst" min="0" max="100" value="${product ? product.gst : 18}" required>
        </div>
        <div class="form-group">
            <label>Total (₹)</label>
            <input type="text" class="edit-product-total" readonly value="${product ? '₹' + product.total.toFixed(2) : ''}">
        </div>
        <button type="button" class="btn-remove-edit-product">Remove</button>
    `;
    
    productsContainer.appendChild(productRow);
    
    // Add event listeners
    const removeBtn = productRow.querySelector('.btn-remove-edit-product');
    removeBtn.addEventListener('click', function() {
        if (document.querySelectorAll('.product-row').length > 1) {
            productRow.remove();
            calculateEditTotals();
        } else {
            alert('Invoice must have at least one product.');
        }
    });
    
    // Add input event listeners for auto-calculation
    const inputs = productRow.querySelectorAll('.edit-product-quantity, .edit-product-price, .edit-product-gst');
    inputs.forEach(input => {
        input.addEventListener('input', calculateEditTotals);
    });
}

// Calculate totals for edit form
function calculateEditTotals() {
    const productRows = document.querySelectorAll('#edit-products-container .product-row');
    let subtotal = 0;
    let gstTotal = 0;
    let grandTotal = 0;
    
    productRows.forEach(row => {
        const quantity = parseFloat(row.querySelector('.edit-product-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.edit-product-price').value) || 0;
        const gstPercent = parseFloat(row.querySelector('.edit-product-gst').value) || 0;
        
        const productSubtotal = quantity * price;
        const productGst = productSubtotal * (gstPercent / 100);
        const productTotal = productSubtotal + productGst;
        
        // Update product total display
        row.querySelector('.edit-product-total').value = `₹${productTotal.toFixed(2)}`;
        
        subtotal += productSubtotal;
        gstTotal += productGst;
        grandTotal += productTotal;
    });
    
    updateEditTotals(subtotal, gstTotal, grandTotal);
}

// Update edit form totals display
function updateEditTotals(subtotal, gstTotal, grandTotal) {
    document.getElementById('edit-subtotal-amount').textContent = `₹${subtotal.toFixed(2)}`;
    document.getElementById('edit-gst-amount').textContent = `₹${gstTotal.toFixed(2)}`;
    document.getElementById('edit-grand-total').textContent = `₹${grandTotal.toFixed(2)}`;
}

// Update invoice in Firestore
function updateInvoice() {
    const invoiceId = document.getElementById('edit-invoice-form').dataset.invoiceId;
    if (!invoiceId) {
        showMessage('Invoice ID not found', 'error');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        showMessage('Please log in to update invoices', 'error');
        return;
    }
    
    // Get updated customer details
    const customerName = document.getElementById('edit-customer-name').value;
    const customerMobile = document.getElementById('edit-customer-mobile').value;
    
    // Get updated products
    const products = [];
    const productRows = document.querySelectorAll('#edit-products-container .product-row');
    
    productRows.forEach(row => {
        const productName = row.querySelector('.edit-product-name').value;
        const quantity = parseFloat(row.querySelector('.edit-product-quantity').value);
        const price = parseFloat(row.querySelector('.edit-product-price').value);
        const gst = parseFloat(row.querySelector('.edit-product-gst').value);
        const totalElement = row.querySelector('.edit-product-total').value;
        const total = totalElement ? parseFloat(totalElement.replace('₹', '')) : 0;
        
        if (productName.trim()) {
            products.push({
                name: productName,
                quantity: quantity,
                price: price,
                gst: gst,
                total: total
            });
        }
    });
    
    // Calculate updated totals
    const subtotal = parseFloat(document.getElementById('edit-subtotal-amount').textContent.replace('₹', ''));
    const gstAmount = parseFloat(document.getElementById('edit-gst-amount').textContent.replace('₹', ''));
    const grandTotal = parseFloat(document.getElementById('edit-grand-total').textContent.replace('₹', ''));
    
    // Create updated invoice object
    const updatedInvoice = {
        customerName: customerName,
        customerMobile: customerMobile,
        products: products,
        subtotal: subtotal,
        gstAmount: gstAmount,
        grandTotal: grandTotal,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Update in Firestore
    db.collection('invoices').doc(invoiceId).update(updatedInvoice)
        .then(() => {
            showMessage('Invoice updated successfully!', 'success');
            closeEditModal();
            loadAllInvoices(); // Reload the list
        })
        .catch((error) => {
            showMessage('Error updating invoice: ' + error.message, 'error');
            console.error('Error updating invoice:', error);
        });
}

// Close edit modal
function closeEditModal() {
    document.getElementById('edit-invoice-modal').classList.add('hidden');
    document.getElementById('edit-invoice-form').reset();
    document.getElementById('edit-products-container').innerHTML = '';
}

// Setup edit modal event listeners
function setupEditModalListeners() {
    // Add product button
    document.getElementById('edit-add-product-btn').addEventListener('click', function() {
        addEditProductRow();
    });
    
    // Update invoice button
    document.getElementById('update-invoice-btn').addEventListener('click', function(e) {
        e.preventDefault();
        updateInvoice();
    });
    
    // Close and cancel buttons
    document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit-btn').addEventListener('click', closeEditModal);
}

// View invoice details
window.viewInvoice = function(invoiceId) {
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
};

// Safe initialization for invoices page
function initInvoicesPageSafely() {
    // Wait for auth to be available
    if (typeof auth === 'undefined' || !auth) {
        setTimeout(initInvoicesPageSafely, 100);
        return;
    }
    
    // Check if we're on the invoices page and initialize
    if (document.getElementById('invoices-page')) {
        initInvoicesPage();
    }
}

document.addEventListener('DOMContentLoaded', initInvoicesPageSafely);
