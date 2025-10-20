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

// Global message display function
function showMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.classList.remove('hidden');
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                messageEl.classList.add('hidden');
            }, 3000);
        }
    }
}

// Redirect to main application
function redirectToApp() {
    window.location.href = 'index.html';
}

// Redirect to auth page
function redirectToAuth() {
    window.location.href = 'auth.html';
}

// Check if user is on auth page
function isAuthPage() {
    return window.location.pathname.includes('auth.html') || 
           window.location.pathname.endsWith('auth.html');
}

// Check if user is on main app page
function isAppPage() {
    return window.location.pathname.includes('index.html') || 
           window.location.pathname.endsWith('/') ||
           window.location.pathname.endsWith('.html') && !window.location.pathname.includes('auth.html');
}

// Setup authentication state observer
function setupAuthObserver() {
    auth.onAuthStateChanged((user) => {
        console.log('=== AUTH STATE CHANGED ===');
        console.log('User:', user);
        
        if (user) {
            // User is signed in
            console.log('User signed in');
            
            if (isAuthPage()) {
                // Redirect to main app if on auth page
                console.log('Redirecting to main application');
                redirectToApp();
            } else {
                // User is already on main app, initialize app
                console.log('User on main app, initializing...');
                if (typeof initApp === 'function') {
                    initApp();
                }
            }
        } else {
            // User is signed out
            console.log('User signed out');
            
            if (isAppPage()) {
                // Redirect to auth page if on main app
                console.log('Redirecting to auth page');
                redirectToAuth();
            } else {
                // User is already on auth page, hide loading
                console.log('User on auth page');
                hideLoadingScreen();
            }
        }
    });
}

// Hide loading screen
function hideLoadingScreen() {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 500);
}

// Login Form Handler
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
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
                    showMessage('Login successful! Redirecting...', 'success');
                    // The auth state observer will handle redirection automatically
                })
                .catch((error) => {
                    showMessage(error.message, 'error');
                    // Reset button
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                });
        });
    }
}

// Password Reset Form Handler
function setupResetPasswordForm() {
    const resetForm = document.getElementById('reset-password-form');
    if (resetForm) {
        resetForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('reset-email').value;
            
            // Show loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Sending...';
            submitBtn.disabled = true;
            
            auth.sendPasswordResetEmail(email)
                .then(() => {
                    showMessage('Password reset email sent! Check your inbox.', 'success');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                })
                .catch((error) => {
                    showMessage(error.message, 'error');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                });
        });
    }
}

// Toggle between Login and Reset Password forms
function setupFormToggles() {
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login');
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('reset-password-form').classList.remove('hidden');
        });
    }
    
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('reset-password-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
        });
    }
}

// Setup logout buttons function
function setupLogoutButtons() {
    console.log('Setting up logout buttons...');
    
    const logoutButtons = [
        'logout-btn', 'logout-btn-2', 'logout-btn-3', 'logout-btn-4'
    ];
    
    logoutButtons.forEach(btnId => {
        const logoutBtn = document.getElementById(btnId);
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Logout button clicked:', btnId);
                auth.signOut().then(() => {
                    showMessage('Logged out successfully', 'success');
                    // Auth observer will handle redirection
                }).catch((error) => {
                    showMessage('Error logging out: ' + error.message, 'error');
                });
            });
        }
    });
}

// Initialize authentication functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth.js loaded');
    
    // Setup auth observer first
    setupAuthObserver();
    
    // Setup forms if on auth page
    if (isAuthPage()) {
        setupLoginForm();
        setupResetPasswordForm();
        setupFormToggles();
    }
    
    // Setup logout buttons if on main app
    if (isAppPage()) {
        setupLogoutButtons();
    }
});
