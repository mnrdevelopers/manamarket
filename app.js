// Main Application Logic
// This version supports multi-page navigation, authentication, and dynamic settings loading.

// Global page management function
function showPage(pageId) {
    console.log('showPage called for:', pageId);
    
    // Update URL hash immediately for page persistence
    window.location.hash = '#' + pageId.replace('-page', '');

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

// Get the initial page from URL hash, defaulting to dashboard
function getInitialPage() {
    let page = window.location.hash.substring(1);
    
    if (page && document.getElementById(page + '-page')) {
        return page + '-page';
    }
    // Default fallback to dashboard
    return 'dashboard-page';
}

// Set active state for navigation button
function setActiveNavButton(pageId) {
    let baseId = pageId.replace('-page', '');
    
    // Handle specific mappings
    if (baseId === 'invoice') baseId = 'create-invoice-nav';
    if (baseId === 'invoices') baseId = 'invoices-list-nav';
    if (baseId === 'stock') baseId = 'stock-management-nav';
    if (baseId === 'customers') baseId = 'customers-nav';
    if (baseId === 'settings') baseId = 'settings-nav';

    // Set active state for the corresponding nav button using attribute selector for robustness
    document.querySelectorAll(`[id^="${baseId}"]`).forEach(btn => {
        if (btn.id.startsWith(baseId)) {
            btn.classList.add('active');
        }
    });
}

// Hide all pages initially and show loading
function hideAllPages() {
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('active');
    });
}

/**
 * Updates all visible instances of the application and business name/address.
 * This should be called on app initialization and after settings are saved.
 * @param {object} settings - The current business settings (optional).
 */
function refreshAppHeader(settings) {
    const businessName = settings ? settings.businessName : 'MNR INVOBILL';
    const address = settings ? settings.address : 'Professional Invoicing for Every Business';
    
    // 1. Update document title (browser tab)
    document.title = `${businessName} - Professional Invoice System`;

    // 2. Update loading screen title
    const loadingAppName = document.getElementById('loading-app-name');
    if (loadingAppName) {
        loadingAppName.textContent = businessName;
    }
    
    // 3. Update all header display elements (logo section)
    document.querySelectorAll('.app-name-display').forEach(el => {
        el.textContent = businessName;
    });

    // 4. Update the hardcoded business address/tagline on the loading screen and potentially auth page (if present)
    // Note: The main address fields for the invoice preview and settings page are handled by settings.js and invoice.js
    console.log(`App headers refreshed. Name: ${businessName}, Address/Tagline: ${address}`);
}


// Initialize the application
function initApp() {
    console.log('Initializing app...');
    
    // Load settings first (if successful, currentSettings will be populated)
    if (typeof loadSettings === 'function') {
        loadSettings().then((settings) => {
             // Refresh header after settings are loaded
            refreshAppHeader(settings);
        }).catch((error) => {
            console.warn("Failed to load settings on init:", error);
            refreshAppHeader(null); // Use default fallback
        });
    } else {
        refreshAppHeader(null); // Use default fallback if settings.js isn't linked
    }

     // Setup global print handler
    setupGlobalPrintHandler();
    
    // Setup global modal handlers
    setupGlobalModalHandlers();
    
    // Check if user is authenticated
    if (!auth.currentUser) {
        console.log('No user logged in, redirecting will be handled by auth observer');
        return;
    }
    
    // Setup navigation
    setupNavigation();
    
    // Show the page based on the URL hash
    const initialPage = getInitialPage();
    console.log('User logged in, showing initial page:', initialPage);
    showPage(initialPage);
    
    // Load dashboard data if starting on dashboard
    if (initialPage === 'dashboard-page') {
        setTimeout(() => {
            console.log('Loading dashboard data after timeout');
            loadDashboardData();
        }, 300);
    }
    
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
    
    const navMapping = {
        'dashboard': 'dashboard-page',
        'create-invoice': 'invoice-page',
        'invoices-list': 'invoices-page',
        'stock-management': 'stock-page',
        'customers': 'customers-page',
        'settings': 'settings-page'
    };

    // Iterate through all possible navigation buttons and attach listener
    Object.keys(navMapping).forEach(baseId => {
        const targetPageId = navMapping[baseId];
        
        // Find all buttons starting with the base ID (e.g., dashboard-nav, dashboard-nav-2, etc.)
        document.querySelectorAll(`[id^="${baseId}-nav"]`).forEach(navBtn => {
            if (navBtn) {
                navBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log(`Nav clicked for ${targetPageId}`);
                    showPage(targetPageId);
                });
            }
        });
    });
    
    // Quick action buttons in dashboard
    const quickActions = {
        'quick-create-invoice': 'invoice-page',
        'quick-view-invoices': 'invoices-page',
        'view-all-invoices': 'invoices-page',
        'quick-stock-management': 'stock-page'
    };
    
    Object.keys(quickActions).forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                showPage(quickActions[btnId]);
            });
        }
    });

    // Back to invoices button
    const backToInvoices = document.getElementById('back-to-invoices');
    if (backToInvoices) {
        backToInvoices.addEventListener('click', function(e) {
            e.preventDefault();
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
        case 'customers-page':
            if (typeof initCustomersPage === 'function') {
                setTimeout(initCustomersPage, 100);
            }
            break;
        case 'settings-page':
            if (typeof initSettingsPage === 'function') {
                setTimeout(initSettingsPage, 100);
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

        // Close customer modal
        if (e.target.id === 'close-customer-modal' ||
            e.target.id === 'cancel-customer-btn' ||
            e.target.closest('#close-customer-modal') ||
            e.target.closest('#cancel-customer-btn')) {
            
            e.preventDefault();
            console.log('Closing customer modal');
            document.getElementById('customer-modal').classList.add('hidden');
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
                // Use the asynchronous function to ensure settings are loaded
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

/**
 * Generates the professional invoice preview layout.
 * This is an asynchronous wrapper to ensure settings are loaded first.
 * @param {Object} invoice - The invoice data object.
 * @param {string} invoiceId - The Firestore document ID.
 */
window.generateInvoicePreview = async function(invoice, invoiceId) {
    // Ensure settings are loaded before proceeding
    if (!window.currentSettings && typeof loadSettings === 'function') {
        try {
            await loadSettings();
        } catch (error) {
            console.warn("Could not load settings for preview, using defaults.", error);
        }
    }

    const settings = window.currentSettings || {
        businessName: 'MNR INVOBILL',
        address: 'Professional Invoicing App',
        gstin: 'N/A',
        pan: 'N/A',
        bankDetails: 'N/A',
        terms: 'Payment due upon receipt. Thank you for your business!'
    };
    
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
                    <td class="qty-cell">${index + 1}</td>
                    <td class="product-name-cell">${product.name}</td>
                    <td class="qty-cell">${product.quantity}</td>
                    <td class="qty-cell">₹${product.price.toFixed(2)}</td>
                    <td class="gst-cell">${product.gst}%</td>
                    <td class="qty-cell">₹${(product.total - product.gstAmount).toFixed(2)}</td>
                    <td class="total-cell">₹${product.total.toFixed(2)}</td>
                </tr>
            `;
        });
    }

    // Determine GST Breakdown
    const gstTotal = invoice.gstAmount || 0;
    const isInterState = false; // Simplified assumption, can be dynamic
    let gstBreakdown = '';

    if (gstTotal > 0) {
        if (isInterState) {
            gstBreakdown = `
                <div class="totals-row">
                    <span class="label">IGST (${(gstTotal / invoice.subtotal * 100).toFixed(2)}%):</span>
                    <span class="value">₹${gstTotal.toFixed(2)}</span>
                </div>
            `;
        } else {
            const halfGst = gstTotal / 2;
            gstBreakdown = `
                <div class="totals-row">
                    <span class="label">CGST (${(halfGst / invoice.subtotal * 100).toFixed(2)}%):</span>
                    <span class="value">₹${halfGst.toFixed(2)}</span>
                </div>
                <div class="totals-row">
                    <span class="label">SGST (${(halfGst / invoice.subtotal * 100).toFixed(2)}%):</span>
                    <span class="value">₹${halfGst.toFixed(2)}</span>
                </div>
            `;
        }
    }

    const customerAddress = invoice.customerAddress ? `<p>${invoice.customerAddress.replace(/\n/g, '<br>')}</p>` : '<p>Address not provided</p>';
    
    previewContent.innerHTML = `
        <div class="invoice-paper-template">
            <!-- Header (Company Details) -->
            <div class="invoice-header-print">
                <div class="company-name-section">
                    <p class="company-name-print">${settings.businessName}</p>
                    <p class="company-address">${settings.address.replace(/\n/g, '<br>')}</p>
                    <p class="company-details">GSTIN: ${settings.gstin || 'N/A'}</p>
                    ${settings.pan ? `<p class="company-details">PAN: ${settings.pan}</p>` : ''}
                </div>
                <div class="company-address-section">
                    <h2 style="margin-bottom: 5px; color: #303841;">TAX INVOICE</h2>
                    <p class="company-details">Mobile: ${settings.bankDetails || 'N/A'}</p>
                    ${settings.bankDetails ? `<p class="company-details">Bank: ${settings.bankDetails}</p>` : ''}
                </div>
            </div>

            <!-- Customer Details -->
            <div class="details-section">
                <div class="bill-to-info">
                    <h4>Bill To:</h4>
                    <p><strong>${invoice.customerName}</strong></p>
                    <p>Mobile: ${invoice.customerMobile}</p>
                    ${customerAddress}
                </div>
                <div class="invoice-meta-info">
                    <div class="meta-row">
                        <span>Invoice No.:</span> <span class="invoice-number-simple">${displayInvoiceNumber}</span>
                    </div>
                    <div class="meta-row">
                        <span>Date of Issue:</span> <span>${invoiceDate}</span>
                    </div>
                    <div class="meta-row">
                        <span>Status:</span> <span class="invoice-status">${invoice.status}</span>
                    </div>
                </div>
            </div>
            
            <!-- Products Table -->
            <table class="products-table-print">
                <thead>
                    <tr>
                        <th class="qty-cell">S.No.</th>
                        <th class="product-name-cell">Description of Goods/Services</th>
                        <th class="qty-cell">Qty</th>
                        <th class="qty-cell">Rate (₹)</th>
                        <th class="gst-cell">GST (%)</th>
                        <th class="qty-cell">Taxable Value (₹)</th>
                        <th class="total-cell">Amount (₹)</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsRows}
                </tbody>
            </table>
            
            <!-- Totals Section -->
            <div class="summary-section">
                <div class="amount-in-words">
                    <p><strong>Amount in Words:</strong> Not Implemented Yet</p>
                </div>
                <div class="totals-preview-print">
                    <div class="totals-row">
                        <span class="label">Subtotal:</span>
                        <span class="value">₹${invoice.subtotal.toFixed(2)}</span>
                    </div>
                    ${gstBreakdown}
                    <div class="totals-row grand-total-row">
                        <span class="label">GRAND TOTAL:</span>
                        <span class="value">₹${invoice.grandTotal.toFixed(2)}</span>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div class="invoice-footer-print">
                <div class="terms-conditions">
                    <p><strong>Notes / Terms:</strong></p>
                    <p>${settings.terms ? settings.terms.replace(/\n/g, '<br>') : 'Goods once sold cannot be returned.'}</p>
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
