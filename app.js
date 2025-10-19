// Main Application Logic

// Initialize the application
function initApp() {
    console.log('Initializing app...');
    
    // Wait for auth to be ready
    if (typeof auth !== 'undefined' && auth.currentUser) {
        setupNavigation();
        const user = auth.currentUser;
        if (user && document.getElementById('dashboard-page').classList.contains('active')) {
            console.log('User is logged in and on dashboard, loading data...');
            setTimeout(loadDashboardData, 100);
        }
    } else {
        setTimeout(initApp, 100); // Retry after auth loads
    }
}

// Setup navigation between pages
function setupNavigation() {
    console.log('Setting up navigation...');
    
    // Dashboard navigation
    const dashboardNav1 = document.getElementById('dashboard-nav');
    const dashboardNav2 = document.getElementById('dashboard-nav-2');
    
    const setupNavHandler = (element, pageId) => {
        if (element) {
            element.addEventListener('click', function() {
                console.log('Navigation clicked:', pageId);
                showPage(pageId);
                if (pageId === 'dashboard-page') {
                    setTimeout(loadDashboardData, 100);
                }
            });
        }
    };
    
    setupNavHandler(dashboardNav1, 'dashboard-page');
    setupNavHandler(dashboardNav2, 'dashboard-page');
    
    // Create invoice navigation
    const createInvoiceNav1 = document.getElementById('create-invoice-nav');
    const createInvoiceNav2 = document.getElementById('create-invoice-nav-2');
    
    setupNavHandler(createInvoiceNav1, 'invoice-page');
    setupNavHandler(createInvoiceNav2, 'invoice-page');
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    // Wait for all scripts to load
    setTimeout(initApp, 300);
});
