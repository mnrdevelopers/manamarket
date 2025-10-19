// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAvCjDqOhhWb-zXfJGlrBdL53ViOVuXPzM",
  authDomain: "shivam-indane-gas.firebaseapp.com",
  projectId: "shivam-indane-gas",
  storageBucket: "shivam-indane-gas.firebasestorage.app",
  messagingSenderId: "950688907317",
  appId: "1:950688907317:web:7282d90dcf56884122717c"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Authentication State Observer
auth.onAuthStateChanged((user) => {
    console.log('Auth state changed, user:', user);
    if (user) {
        // User is signed in
        showPage('dashboard-page');
        // Wait for DOM to be ready before loading dashboard data
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function() {
                setTimeout(() => {
                    loadDashboardData();
                    if (typeof loadRecentInvoices === 'function') {
                        loadRecentInvoices();
                    }
                }, 100);
            });
        } else {
            setTimeout(() => {
                loadDashboardData();
                if (typeof loadRecentInvoices === 'function') {
                    loadRecentInvoices();
                }
            }, 100);
        }
    } else {
        // User is signed out
        showPage('login-page');
    }
});

// Login Form Handler
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in successfully
            showMessage('Login successful!', 'success');
        })
        .catch((error) => {
            showMessage(error.message, 'error');
        });
});

// Password Reset Form Handler
document.getElementById('reset-password-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('reset-email').value;
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            showMessage('Password reset email sent!', 'success');
        })
        .catch((error) => {
            showMessage(error.message, 'error');
        });
});

// Logout Handler
function setupLogoutButtons() {
    const logoutButtons = document.querySelectorAll('#logout-btn, #logout-btn-2');
    logoutButtons.forEach(button => {
        button.addEventListener('click', () => {
            auth.signOut()
                .then(() => {
                    showMessage('Logged out successfully', 'success');
                })
                .catch((error) => {
                    showMessage(error.message, 'error');
                });
        });
    });
}

// Toggle between Login and Reset Password forms
document.getElementById('forgot-password-link').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('reset-password-form').classList.remove('hidden');
});

document.getElementById('back-to-login').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('reset-password-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
});

// Utility Functions
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the requested page
    document.getElementById(pageId).classList.add('active');
}

function showMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.classList.remove('hidden');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        messageEl.classList.add('hidden');
    }, 5000);
}

// Initialize authentication functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupLogoutButtons();
});

// Load dashboard data (make it globally accessible)
function loadDashboardData() {
    const user = auth.currentUser;
    if (!user) {
        console.log('No user logged in');
        return;
    }

    console.log('Loading dashboard data for user:', user.uid);

    // Load recent invoices
    if (typeof loadRecentInvoices === 'function') {
        loadRecentInvoices();
    }

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
            const todayInvoicesEl = document.getElementById('today-invoices');
            const monthInvoicesEl = document.getElementById('month-invoices');
            const totalRevenueEl = document.getElementById('total-revenue');
            
            if (todayInvoicesEl) todayInvoicesEl.textContent = todayInvoices;
            if (monthInvoicesEl) monthInvoicesEl.textContent = monthInvoices;
            if (totalRevenueEl) totalRevenueEl.textContent = `₹${totalRevenue.toFixed(2)}`;
        })
        .catch((error) => {
            console.error('Error loading invoices for dashboard:', error);
        });
}
