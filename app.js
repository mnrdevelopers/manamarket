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
    
    // Show the requested page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.style.display = 'block';
        targetPage.classList.add('active');
        console.log('Successfully showed page:', pageId);
    } else {
        console.error('Page not found:', pageId);
    }
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
    
    // Setup navigation first
    setupNavigation();
    
    // Check auth state and show appropriate page
    if (typeof auth !== 'undefined' && auth.currentUser) {
        console.log('User already logged in, showing dashboard');
        showPage('dashboard-page');
        setTimeout(loadDashboardData, 100);
    } else {
        console.log('No user logged in, showing login page');
        showPage('login-page');
    }
    
    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 500);
}

// Setup navigation between pages
function setupNavigation() {
    console.log('Setting up navigation...');
    
    // Dashboard navigation
    const dashboardNav1 = document.getElementById('dashboard-nav');
    const dashboardNav2 = document.getElementById('dashboard-nav-2');
    
    if (dashboardNav1) {
        dashboardNav1.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Dashboard nav 1 clicked');
            showPage('dashboard-page');
            setTimeout(loadDashboardData, 100);
        });
    }
    
    if (dashboardNav2) {
        dashboardNav2.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Dashboard nav 2 clicked');
            showPage('dashboard-page');
            setTimeout(loadDashboardData, 100);
        });
    }
    
    // Create invoice navigation
    const createInvoiceNav1 = document.getElementById('create-invoice-nav');
    const createInvoiceNav2 = document.getElementById('create-invoice-nav-2');
    
    if (createInvoiceNav1) {
        createInvoiceNav1.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Create invoice nav 1 clicked');
            showPage('invoice-page');
        });
    }
    
    if (createInvoiceNav2) {
        createInvoiceNav2.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Create invoice nav 2 clicked');
            showPage('invoice-page');
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
    
    if (!todayInvoicesEl || !monthInvoicesEl || !totalRevenueEl) {
        console.log('Dashboard elements not found, skipping data load');
        return;
    }
    
    const user = auth.currentUser;
    if (!user) {
        console.log('No user logged in, skipping dashboard data load');
        todayInvoicesEl.textContent = '0';
        monthInvoicesEl.textContent = '0';
        totalRevenueEl.textContent = '₹0';
        return;
    }

    console.log('Loading dashboard data for user:', user.uid);

    // Load recent invoices
    if (typeof loadRecentInvoices === 'function') {
        loadRecentInvoices();
    } else {
        console.log('loadRecentInvoices function not available yet');
    }

    // Get all invoices and filter locally to avoid complex queries
    db.collection('invoices')
        .where('createdBy', '==', user.uid)
        .get()
        .then((querySnapshot) => {
            console.log('Found invoices:', querySnapshot.size);
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
            console.error('Error loading invoices for dashboard:', error);
            todayInvoicesEl.textContent = '0';
            monthInvoicesEl.textContent = '0';
            totalRevenueEl.textContent = '₹0';
        });
}

// Enhanced authentication state observer
function setupAuthObserver() {
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged((user) => {
            console.log('=== AUTH STATE CHANGED ===');
            console.log('User:', user);
            
            if (user) {
                // User is signed in
                console.log('User signed in, showing dashboard');
                showPage('dashboard-page');
                
                // Load dashboard data after a short delay
                setTimeout(() => {
                    if (typeof loadDashboardData === 'function') {
                        loadDashboardData();
                    }
                }, 500);
            } else {
                // User is signed out
                console.log('User signed out, showing login page');
                showPage('login-page');
            }
            
            // Hide loading screen after auth check
            setTimeout(() => {
                const loadingScreen = document.getElementById('loading-screen');
                if (loadingScreen) {
                    loadingScreen.classList.add('hidden');
                }
            }, 300);
        });
    } else {
        console.error('Firebase auth not available');
        // Fallback: show login page after timeout
        setTimeout(() => {
            showPage('login-page');
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
            }
        }, 1000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    
    // Hide all pages immediately to prevent flicker
    hideAllPages();
    
    // Setup auth observer
    setupAuthObserver();
    
    // Then initialize the rest of the app
    setTimeout(initApp, 300);
});
