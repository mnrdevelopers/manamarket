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
function loadDashboardData() {
    const user = auth.currentUser;
    if (!user) return;
    
    // Load recent invoices
    loadRecentInvoices();
    
    // Calculate today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Calculate this month's date range
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    
    // Get today's invoices
    db.collection('invoices')
        .where('createdBy', '==', user.uid)
        .where('createdAt', '>=', today)
        .where('createdAt', '<', tomorrow)
        .get()
        .then((querySnapshot) => {
            document.getElementById('today-invoices').textContent = querySnapshot.size;
        })
        .catch((error) => {
            console.error('Error loading today\'s invoices:', error);
        });
    
    // Get this month's invoices
    db.collection('invoices')
        .where('createdBy', '==', user.uid)
        .where('createdAt', '>=', firstDayOfMonth)
        .where('createdAt', '<', firstDayOfNextMonth)
        .get()
        .then((querySnapshot) => {
            document.getElementById('month-invoices').textContent = querySnapshot.size;
        })
        .catch((error) => {
            console.error('Error loading month\'s invoices:', error);
        });
    
    // Calculate total revenue (all invoices)
    db.collection('invoices')
        .where('createdBy', '==', user.uid)
        .get()
        .then((querySnapshot) => {
            let totalRevenue = 0;
            querySnapshot.forEach((doc) => {
                const invoice = doc.data();
                totalRevenue += invoice.grandTotal;
            });
            document.getElementById('total-revenue').textContent = `₹${totalRevenue.toFixed(2)}`;
        })
        .catch((error) => {
            console.error('Error calculating total revenue:', error);
        });
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);
