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

// Global page management functions
function showPage(pageId) {
    console.log('Showing page:', pageId);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show the requested page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        console.log('Page shown successfully:', pageId);
    } else {
        console.error('Page not found:', pageId);
    }
}

// Global message function with fallback
function showMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.classList.remove('hidden');
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            messageEl.classList.add('hidden');
        }, 5000);
    } else {
        // Fallback if element doesn't exist yet
        console.log(`${type}: ${message}`);
    }
}

// Authentication State Observer
auth.onAuthStateChanged((user) => {
    console.log('Auth state changed, user:', user);
    
    const loginPage = document.getElementById('login-page');
    const dashboardPage = document.getElementById('dashboard-page');
    const invoicePage = document.getElementById('invoice-page');
    
    if (user) {
        // User is signed in
        console.log('User signed in, hiding login page');
        
        // Hide login page
        if (loginPage) loginPage.classList.remove('active');
        
        // Show dashboard by default
        if (dashboardPage) {
            dashboardPage.classList.add('active');
            // Load dashboard data
            setTimeout(() => {
                if (typeof loadDashboardData === 'function') {
                    loadDashboardData();
                }
                if (typeof loadRecentInvoices === 'function') {
                    loadRecentInvoices();
                }
            }, 500);
        }
        
        // Ensure invoice page is hidden unless explicitly navigated to
        if (invoicePage) invoicePage.classList.remove('active');
        
    } else {
        // User is signed out
        console.log('User signed out, showing login page');
        
        // Show login page
        if (loginPage) loginPage.classList.add('active');
        
        // Hide other pages
        if (dashboardPage) dashboardPage.classList.remove('active');
        if (invoicePage) invoicePage.classList.remove('active');
    }
});

// Login Form Handler
document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Show loading state
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Logging in...';
    submitBtn.disabled = true;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in successfully
            showMessage('Login successful!', 'success');
            // The auth state observer will handle page navigation automatically
        })
        .catch((error) => {
            showMessage(error.message, 'error');
            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
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

// Initialize authentication functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth.js loaded');
    setupLogoutButtons();
});
