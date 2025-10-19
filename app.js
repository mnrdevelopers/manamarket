// Main Application Logic

// Initialize the application
function initApp() {
    console.log('Initializing app...');
    // Setup navigation
    setupNavigation();
    
    // Check if we're already on dashboard and user is logged in
    const user = auth.currentUser;
    if (user && document.getElementById('dashboard-page').classList.contains('active')) {
        console.log('User is logged in and on dashboard, loading data...');
        loadDashboardData();
    }
}

// Setup navigation between pages
function setupNavigation() {
    console.log('Setting up navigation...');
    
    // Dashboard navigation
    const dashboardNav1 = document.getElementById('dashboard-nav');
    const dashboardNav2 = document.getElementById('dashboard-nav-2');
    
    if (dashboardNav1) {
        dashboardNav1.addEventListener('click', function() {
            console.log('Dashboard nav 1 clicked');
            showPage('dashboard-page');
            loadDashboardData();
        });
    }
    
    if (dashboardNav2) {
        dashboardNav2.addEventListener('click', function() {
            console.log('Dashboard nav 2 clicked');
            showPage('dashboard-page');
            loadDashboardData();
        });
    }
    
    // Create invoice navigation
    const createInvoiceNav1 = document.getElementById('create-invoice-nav');
    const createInvoiceNav2 = document.getElementById('create-invoice-nav-2');
    
    if (createInvoiceNav1) {
        createInvoiceNav1.addEventListener('click', function() {
            console.log('Create invoice nav 1 clicked');
            showPage('invoice-page');
        });
    }
    
    if (createInvoiceNav2) {
        createInvoiceNav2.addEventListener('click', function() {
            console.log('Create invoice nav 2 clicked');
            showPage('invoice-page');
        });
    }
}

// Load dashboard data and statistics
function loadDashboardData() {
    console.log('Loading dashboard data...');
    const user = auth.currentUser;
    if (!user) {
        console.log('No user logged in, skipping dashboard data load');
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
                
                totalRevenue += invoice.grandTotal;
                
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
            document.getElementById('today-invoices').textContent = todayInvoices;
            document.getElementById('month-invoices').textContent = monthInvoices;
            document.getElementById('total-revenue').textContent = `₹${totalRevenue.toFixed(2)}`;
            
            console.log('Dashboard stats updated:', { todayInvoices, monthInvoices, totalRevenue });
        })
        .catch((error) => {
            console.error('Error loading invoices for dashboard:', error);
        });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing app...');
    // Wait a bit to ensure all scripts are loaded
    setTimeout(initApp, 100);
});
