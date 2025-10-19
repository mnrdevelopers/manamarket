// Main Application Logic

// Initialize the application
function initApp() {
    // Setup navigation
    setupNavigation();
    
    // Load dashboard data when dashboard is shown
    document.getElementById('dashboard-page').addEventListener('DOMNodeInserted', loadDashboardData);
}

// Setup navigation between pages
function setupNavigation() {
    // Dashboard navigation
    document.getElementById('dashboard-nav').addEventListener('click', function() {
        showPage('dashboard-page');
        loadDashboardData();
    });
    
    document.getElementById('dashboard-nav-2').addEventListener('click', function() {
        showPage('dashboard-page');
        loadDashboardData();
    });
    
    // Create invoice navigation
    document.getElementById('create-invoice-nav').addEventListener('click', function() {
        showPage('invoice-page');
    });
    
    document.getElementById('create-invoice-nav-2').addEventListener('click', function() {
        showPage('invoice-page');
    });
}

// Load dashboard data and statistics
// Load dashboard data and statistics
function loadDashboardData() {
    const user = auth.currentUser;
    if (!user) return;

    // Load recent invoices
    loadRecentInvoices();

    // Get all invoices and filter locally to avoid complex queries
    db.collection('invoices')
        .where('createdBy', '==', user.uid)
        .get()
        .then((querySnapshot) => {
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
        })
        .catch((error) => {
            console.error('Error loading invoices for dashboard:', error);
        });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
