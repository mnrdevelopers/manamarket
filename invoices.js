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
    const user = auth.currentUser;
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
        tableBody.innerHTML = '<tr><td colspan="6" class="no-invoices-found">No invoices found</td></tr>';
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
        
        tableHTML += `
            <tr>
                <td>${invoice.id.substring(0, 8)}...</td>
                <td>${invoice.customerName}</td>
                <td>${invoice.customerMobile}</td>
                <td>${invoiceDate}</td>
                <td>₹${invoice.grandTotal.toFixed(2)}</td>
                <td class="invoice-actions-cell">
                    <button class="btn-view view-invoice-details" data-id="${invoice.id}">View</button>
                    <button class="btn-edit edit-invoice" data-id="${invoice.id}">Edit</button>
                    <button class="btn-delete delete-invoice" data-id="${invoice.id}">Delete</button>
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

// Edit invoice - redirect to create invoice page with data
function editInvoice(invoiceId) {
    // For now, we'll just show a message since editing is more complex
    // In a real implementation, you would load the invoice data into the form
    showMessage('Edit functionality will be implemented in the next version', 'info');
    console.log('Edit invoice:', invoiceId);
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

// Initialize invoices functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the invoices page and initialize
    if (document.getElementById('invoices-page')) {
        initInvoicesPage();
    }
});
