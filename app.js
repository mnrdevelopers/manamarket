// Main Application Logic

// Global page management function
function showPage(pageId) {
    console.log('showPage called for:', pageId);
    
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the requested page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
        console.log('Successfully showed page:', pageId);
        
        // Set active state for the corresponding nav button
        setActiveNavButton(pageId);
        
        // Initialize page-specific functionality
        setTimeout(initActivePage, 50);
    } else {
        console.error('Page not found:', pageId);
    }
}

// Set active state for navigation button
function setActiveNavButton(pageId) {
    let activeButtonId = '';
    
    switch(pageId) {
        case 'dashboard-page':
            activeButtonId = 'dashboard-nav';
            break;
        case 'invoice-page':
            activeButtonId = 'create-invoice-nav-2';
            break;
        case 'invoices-page':
            activeButtonId = 'invoices-list-nav-3';
            break;
        case 'stock-page':
            activeButtonId = 'stock-management-nav-4';
            break;
    }
    
    // Also set active state for buttons with the same function on other pages
    const activeButtons = document.querySelectorAll(`[id^="${activeButtonId.split('-')[0]}"]`);
    activeButtons.forEach(btn => {
        btn.classList.add('active');
    });
}

// Hide all pages initially and show loading
function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });
}

// Initialize the application
function initApp() {
    console.log('Initializing app...');

     // Setup global print handler
    setupGlobalPrintHandler();
    
    // Setup global modal handlers (ADD THIS LINE)
    setupGlobalModalHandlers();
    
    // Check if user is authenticated
    if (!auth.currentUser) {
        console.log('No user logged in, redirecting will be handled by auth observer');
        return;
    }
    
    // Setup navigation
    setupNavigation();
    
    // Show dashboard by default
    console.log('User logged in, showing dashboard');
    showPage('dashboard-page');
    
    // Load dashboard data after ensuring page is visible
    setTimeout(() => {
        console.log('Loading dashboard data after timeout');
        loadDashboardData();
    }, 300);
    
    // Hide loading screen
    hideLoadingScreen();
}

// Hide loading screen with smooth transition
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        // Add hidden class for fade out effect
        loadingScreen.classList.add('hidden');
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// Setup navigation between pages
function setupNavigation() {
    console.log('Setting up navigation...');
    
    // Dashboard navigation
    const dashboardNav1 = document.getElementById('dashboard-nav');
    const dashboardNav2 = document.getElementById('dashboard-nav-2');
    const dashboardNav3 = document.getElementById('dashboard-nav-3');
    const dashboardNav4 = document.getElementById('dashboard-nav-4');
    
    [dashboardNav1, dashboardNav2, dashboardNav3, dashboardNav4].forEach((nav, index) => {
        if (nav) {
            nav.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Dashboard nav clicked', index + 1);
                showPage('dashboard-page');
                setTimeout(loadDashboardData, 100);
            });
        }
    });
    
    // Create invoice navigation
    const createInvoiceNav1 = document.getElementById('create-invoice-nav');
    const createInvoiceNav2 = document.getElementById('create-invoice-nav-2');
    const createInvoiceNav3 = document.getElementById('create-invoice-nav-3');
    const createInvoiceNav4 = document.getElementById('create-invoice-nav-4');

    [createInvoiceNav1, createInvoiceNav2, createInvoiceNav3, createInvoiceNav4].forEach((nav, index) => {
        if (nav) {
            nav.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Create invoice nav clicked', index + 1);
                showPage('invoice-page');
                // Refresh available products when switching to invoice page
                if (typeof loadAvailableProducts === 'function') {
                    setTimeout(loadAvailableProducts, 100);
                }
            });
        }
    });
    
    // Invoices list navigation
    const invoicesNav1 = document.getElementById('invoices-list-nav');
    const invoicesNav2 = document.getElementById('invoices-list-nav-2');
    const invoicesNav3 = document.getElementById('invoices-list-nav-3');
    const invoicesNav4 = document.getElementById('invoices-list-nav-4');
    
    [invoicesNav1, invoicesNav2, invoicesNav3, invoicesNav4].forEach((nav, index) => {
        if (nav) {
            nav.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Invoices list nav clicked', index + 1);
                showPage('invoices-page');
                // Load invoices if the function exists
                if (typeof loadAllInvoices === 'function') {
                    setTimeout(loadAllInvoices, 100);
                }
            });
        }
    });

 // Stock management navigation
const stockNav1 = document.getElementById('stock-management-nav');
const stockNav2 = document.getElementById('stock-management-nav-2');
const stockNav3 = document.getElementById('stock-management-nav-3');
const stockNav4 = document.getElementById('stock-management-nav-4');

[stockNav1, stockNav2, stockNav3, stockNav4].forEach((nav, index) => {
    if (nav) {
        nav.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Stock management nav clicked', index + 1);
            showPage('stock-page');
            
            // Wait a bit for page to render, then load products
            setTimeout(() => {
                if (auth && auth.currentUser && typeof loadAllProducts === 'function') {
                    loadAllProducts();
                } else {
                    console.log('Auth not ready or loadAllProducts not available');
                }
            }, 200);
        });
    }
});
    
    // Quick action buttons in dashboard
    const quickCreateInvoice = document.getElementById('quick-create-invoice');
    const quickViewInvoices = document.getElementById('quick-view-invoices');
    const viewAllInvoices = document.getElementById('view-all-invoices');
    const quickStockManagement = document.getElementById('quick-stock-management');
    
    if (quickCreateInvoice) {
        quickCreateInvoice.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Quick create invoice clicked');
            showPage('invoice-page');
        });
    }
    
    if (quickViewInvoices) {
        quickViewInvoices.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Quick view invoices clicked');
            showPage('invoices-page');
            if (typeof loadAllInvoices === 'function') {
                setTimeout(loadAllInvoices, 100);
            }
        });
    }
    
    if (viewAllInvoices) {
        viewAllInvoices.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('View all invoices clicked');
            showPage('invoices-page');
            if (typeof loadAllInvoices === 'function') {
                setTimeout(loadAllInvoices, 100);
            }
        });
    }

    // Quick stock management button
    if (quickStockManagement) {
        quickStockManagement.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Quick stock management clicked');
            showPage('stock-page');
            if (typeof loadAllProducts === 'function') {
                setTimeout(loadAllProducts, 100);
            }
        });
    }
    
    // Back to invoices button in create invoice page
    const backToInvoices = document.getElementById('back-to-invoices');
    if (backToInvoices) {
        backToInvoices.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Back to invoices clicked');
            showPage('invoices-page');
            if (typeof loadAllInvoices === 'function') {
                setTimeout(loadAllInvoices, 100);
            }
        });
    }
}

// Load dashboard data and statistics
function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    // Check if required elements exist
    const todayInvoicesEl = document.getElementById('today-invoices');
    const monthInvoicesEl = document.getElementById('month-invoices');
    const totalRevenueEl = document.getElementById('total-revenue');
    const invoicesList = document.getElementById('invoices-list');
    
    if (!todayInvoicesEl || !monthInvoicesEl || !totalRevenueEl || !invoicesList) {
        console.log('Dashboard elements not found, retrying...');
        setTimeout(loadDashboardData, 100);
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        console.log('No user logged in, skipping dashboard data load');
        todayInvoicesEl.textContent = '0';
        monthInvoicesEl.textContent = '0';
        totalRevenueEl.textContent = '₹0';
        invoicesList.innerHTML = '<p>Please log in to view invoices</p>';
        return;
    }

    console.log('Loading dashboard data for user:', user.uid);

    // Load recent invoices directly
    loadRecentInvoicesDirectly(user);

    // Get all invoices and filter locally to avoid complex queries
    db.collection('invoices')
        .where('createdBy', '==', user.uid)
        .get()
        .then((querySnapshot) => {
            console.log('Found invoices for stats:', querySnapshot.size);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            
            let todayInvoices = 0;
            let monthInvoices = 0;
            let totalRevenue = 0;

            querySnapshot.forEach((doc) => {
                const invoice = doc.data();
                const invoiceDate = invoice.createdAt ? invoice.createdAt.toDate() : new Date();
                
                totalRevenue += invoice.grandTotal || 0;
                
                // Check if invoice is from today
                if (invoiceDate >= today) {
                    todayInvoices++;
                }
                
                // Check if invoice is from this month
                if (invoiceDate >= firstDayOfMonth) {
                    monthInvoices++;
                }
            });

            // Update dashboard stats
            todayInvoicesEl.textContent = todayInvoices;
            monthInvoicesEl.textContent = monthInvoices;
            totalRevenueEl.textContent = `₹${totalRevenue.toFixed(2)}`;
            
            console.log('Dashboard stats updated:', { todayInvoices, monthInvoices, totalRevenue });
        })
        .catch((error) => {
            console.error('Error loading invoices for dashboard stats:', error);
            todayInvoicesEl.textContent = '0';
            monthInvoicesEl.textContent = '0';
            totalRevenueEl.textContent = '₹0';
        });

    // Direct function to load recent invoices
    function loadRecentInvoicesDirectly(user) {
        const invoicesList = document.getElementById('invoices-list');
        if (!invoicesList) {
            console.log('Invoices list not found, retrying...');
            setTimeout(() => loadRecentInvoicesDirectly(user), 100);
            return;
        }

        invoicesList.innerHTML = '<p>Loading invoices...</p>';

        console.log('Loading recent invoices for user:', user.uid);

        // Simple query without ordering first to test
        db.collection('invoices')
            .where('createdBy', '==', user.uid)
            .get()
            .then((querySnapshot) => {
                console.log('Recent invoices query successful, found:', querySnapshot.size);
                invoicesList.innerHTML = '';
                
                if (querySnapshot.empty) {
                    invoicesList.innerHTML = '<p class="no-invoices">No invoices found. Create your first invoice!</p>';
                    return;
                }

                // Convert to array and sort locally
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

                // Show only last 5 invoices
                const recentInvoices = invoices.slice(0, 5);

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

                // Add event listeners to view buttons
                document.querySelectorAll('.view-invoice-btn').forEach(button => {
                    button.addEventListener('click', function() {
                        const invoiceId = this.getAttribute('data-id');
                        if (typeof viewInvoice === 'function') {
                            viewInvoice(invoiceId);
                        } else {
                            console.log('Opening invoice:', invoiceId);
                            // Fallback: show basic alert
                            alert('Invoice ID: ' + invoiceId);
                        }
                    });
                });
            })
            .catch((error) => {
                console.error('Error loading recent invoices:', error);
                console.log('Error code:', error.code);
                console.log('Error message:', error.message);
                
                if (error.code === 'failed-precondition') {
                    // Collection doesn't exist yet or needs index
                    invoicesList.innerHTML = '<p class="no-invoices">No invoices found. Create your first invoice!</p>';
                } else if (error.code === 'permission-denied') {
                    invoicesList.innerHTML = '<p class="no-invoices">Please check database permissions</p>';
                } else {
                    invoicesList.innerHTML = '<p class="no-invoices">Unable to load invoices</p>';
                }
            });
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, checking authentication...');
    
    // Wait for auth to be available
    const initAppSafely = () => {
        if (typeof auth === 'undefined' || !auth) {
            console.log('Auth not ready yet, waiting...');
            setTimeout(initAppSafely, 100);
            return;
        }
        
        console.log('Auth is ready, proceeding with app initialization');
        
        // Hide all pages immediately to prevent flicker
        hideAllPages();
        
        // Check if user is already authenticated
        if (auth.currentUser) {
            console.log('User already authenticated, initializing app');
            initApp();
        } else {
            console.log('No user authenticated, auth observer will handle redirect');
            // Hide loading screen after a timeout
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.classList.add('hidden');
                }
            }, 1000);
        }
    };
    
    initAppSafely();
});

// Initialize page-specific functionality when page becomes active
function initActivePage() {
    const activePage = document.querySelector('.page.active');
    if (!activePage) return;
    
    const pageId = activePage.id;
    console.log('Initializing active page:', pageId);
    
    switch(pageId) {
        case 'stock-page':
            if (typeof initStockPage === 'function') {
                setTimeout(initStockPage, 100);
            }
            break;
        case 'invoice-page':
            if (typeof initInvoicePage === 'function') {
                setTimeout(initInvoicePage, 100);
            }
            break;
        case 'invoices-page':
            if (typeof initInvoicesPage === 'function') {
                setTimeout(initInvoicesPage, 100);
            }
            break;
    }
}

// Temporary debug function - call this in browser console to test
window.debugShowDashboard = function() {
    const dashboardPage = document.getElementById('dashboard-page');
    if (dashboardPage) {
        dashboardPage.style.display = 'block';
        dashboardPage.classList.add('active');
        console.log('Dashboard should be visible now');
    } else {
        console.error('Dashboard page not found in DOM');
    }
};

// Check if dashboard elements exist on load
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - checking dashboard elements:');
    console.log('Dashboard page:', document.getElementById('dashboard-page'));
    console.log('Main content:', document.querySelector('.main-content'));
    console.log('Dashboard stats:', document.querySelector('.dashboard-stats'));
    console.log('Recent invoices:', document.getElementById('invoices-list'));
});

// Add this function to app.js - Perfect Print Solution
function setupGlobalPrintHandler() {
    // Remove any existing click listeners and use a single delegated handler
    document.addEventListener('click', function(e) {
        if (e.target.id === 'print-invoice-btn' || 
            (e.target.closest && e.target.closest('#print-invoice-btn'))) {
            
            e.preventDefault();
            e.stopImmediatePropagation();
            console.log('🖨️ Print button clicked - opening print dialog');
            
            // Small delay to ensure the preview is fully rendered
            setTimeout(() => {
                window.print();
            }, 300);
            
            return false;
        }
    });
}

// Add this function to app.js - Global Modal Close Handler
function setupGlobalModalHandlers() {
    // Close modal when clicking close button, cancel button, or outside modal
    document.addEventListener('click', function(e) {
        // Close invoice preview modal
        if (e.target.id === 'close-preview' || 
            e.target.id === 'close-preview-btn' ||
            e.target.closest('#close-preview') ||
            e.target.closest('#close-preview-btn')) {
            
            e.preventDefault();
            console.log('Closing invoice preview modal');
            document.getElementById('invoice-preview-modal').classList.add('hidden');
        }
        
        // Close delete confirmation modal
        if (e.target.id === 'close-delete-modal' || 
            e.target.id === 'cancel-delete-btn' ||
            e.target.closest('#close-delete-modal') ||
            e.target.closest('#cancel-delete-btn')) {
            
            e.preventDefault();
            console.log('Closing delete confirmation modal');
            document.getElementById('delete-confirm-modal').classList.add('hidden');
        }
        
        // Close edit invoice modal
        if (e.target.id === 'close-edit-modal' || 
            e.target.id === 'cancel-edit-btn' ||
            e.target.closest('#close-edit-modal') ||
            e.target.closest('#cancel-edit-btn')) {
            
            e.preventDefault();
            console.log('Closing edit invoice modal');
            document.getElementById('edit-invoice-modal').classList.add('hidden');
        }
        
        // Close product modal
        if (e.target.id === 'close-product-modal' || 
            e.target.id === 'cancel-product-btn' ||
            e.target.closest('#close-product-modal') ||
            e.target.closest('#cancel-product-btn')) {
            
            e.preventDefault();
            console.log('Closing product modal');
            document.getElementById('product-modal').classList.add('hidden');
        }
        
        // Close modal when clicking outside content
        if (e.target.classList.contains('modal')) {
            console.log('Closing modal by clicking outside');
            e.target.classList.add('hidden');
        }
    });
    
    // Also handle Escape key to close modals
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal:not(.hidden)');
            openModals.forEach(modal => {
                console.log('Closing modal with Escape key');
                modal.classList.add('hidden');
            });
        }
    });
}

// Make sure viewInvoice is available globally for dashboard
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

// Also ensure generateInvoicePreview is available
window.generateInvoicePreview = function(invoice, invoiceId, isPreview = false) {
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
            // Calculate GST amounts for display
            // NOTE: Assuming `product.price` already includes GST and `product.total` is total price including GST for the line item.
            const unitPriceInclGst = product.price; // This is the input unit price from the form
            const priceNoGst = unitPriceInclGst / (1 + (product.gst / 100));
            const gstAmountPerUnit = unitPriceInclGst - priceNoGst;
            
            const subtotalNoGst = priceNoGst * product.quantity;
            const totalGst = gstAmountPerUnit * product.quantity;

            productsRows += `
                <tr>
                    <td>${index + 1}</td>
                    <td class="product-name-cell">${product.name}</td>
                    <td class="qty-cell">${product.quantity}</td>
                    <td class="price-cell">₹${priceNoGst.toFixed(2)}</td>
                    <td class="gst-cell">${product.gst}%</td>
                    <td class="gst-amount-cell">₹${totalGst.toFixed(2)}</td>
                    <td class="total-cell">₹${(subtotalNoGst + totalGst).toFixed(2)}</td>
                </tr>
            `;
        });
    }

    // Convert total to words (Simple conversion for demonstration)
    const grandTotalInWords = convertNumberToWords(invoice.grandTotal.toFixed(2));
    
    previewContent.innerHTML = `
        <div class="invoice-paper-template">
            <!-- Professional Header -->
            <div class="invoice-header-print">
                <div class="company-logo-section">
                    <!-- Placeholder for Company Logo -->
                    <!-- <img src="logo.png" alt="BILLA TRADERS Logo" class="invoice-logo"> -->
                    <div class="company-name-print">BILLA TRADERS</div>
                </div>
                <div class="company-address-section">
                    <p class="company-address">DICHPALLY RS, HYD-NZB ROAD, NIZAMABAD TELANGANA 503175</p>
                    <!-- Add professional details -->
                    <p class="company-details">GSTIN: *XXXXXXXXXXXXXXX* | PAN: *ABCDE1234F*</p>
                </div>
            </div>
            
            <div class="document-title">TAX INVOICE</div>

            <!-- Invoice and Customer Details -->
            <div class="details-section">
                <div class="bill-to-info">
                    <h4>Bill To:</h4>
                    <p><strong>${invoice.customerName}</strong></p>
                    <p>Mobile: ${invoice.customerMobile}</p>
                    <p>Address: N/A</p>
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
                    <p>1. Goods once sold cannot be taken back. 2. Payment due within 30 days. 3. Disputes subject to Nizamabad jurisdiction.</p>
                </div>
                <div class="signature-section">
                    <p>For BILLA TRADERS</p>
                    <div class="signature-line"></div>
                    <p>(Authorized Signatory)</p>
                </div>
            </div>
        </div>
    `;
};

// Loading state utility functions
function showLoading(element) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    if (element) {
        element.classList.add('btn-loading');
    }
}

function hideLoading(element) {
    if (typeof element === 'string') {
        element = document.querySelector(element);
    }
    if (element) {
        element.classList.remove('btn-loading');
    }
}

function showSectionLoading(section) {
    if (typeof section === 'string') {
        section = document.querySelector(section);
    }
    if (section) {
        section.classList.add('loading-section');
    }
}

function hideSectionLoading(section) {
    if (typeof section === 'string') {
        section = document.querySelector(section);
    }
    if (section) {
        section.classList.remove('loading-section');
    }
}

function showTableLoading(table) {
    if (typeof table === 'string') {
        table = document.querySelector(table);
    }
    if (table) {
        table.classList.add('table-loading');
    }
}

function hideTableLoading(table) {
    if (typeof table === 'string') {
        table = document.querySelector(table);
    }
    if (table) {
        table.classList.remove('table-loading');
    }
}

// Auto-attach loading to form submissions
document.addEventListener('DOMContentLoaded', function() {
    // Form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                showLoading(submitBtn);
            }
        });
    });
    
    // Button clicks with data-loading attribute
    document.querySelectorAll('[data-loading]').forEach(button => {
        button.addEventListener('click', function() {
            showLoading(this);
        });
    });
});
