// Dynamic Firebase Configuration & Initialization (MNR INVOBILL)

// NOTE: DO NOT hardcode firebaseConfig here.
// Use the global __firebase_config provided by the environment.

let auth;
let db;

/**
 * Initializes Firebase services using environment variables.
 * @returns {Promise<void>}
 */
async function initializeFirebase() {
    try {
        // Safely parse the global config provided by the environment
        const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

        if (!firebaseConfig.apiKey) {
            throw new Error("Firebase config not loaded correctly. Missing apiKey.");
        }

        // 1. Initialize App
        const app = firebase.initializeApp(firebaseConfig);
        
        // 2. Initialize Services
        auth = firebase.auth(app);
        db = firebase.firestore(app);

        // Make auth and db globally accessible
        window.auth = auth;
        window.db = db;
        
        console.log('Firebase services initialized successfully.');

        // 3. Handle Custom Authentication Token
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        if (initialAuthToken) {
            console.log("Attempting sign-in with custom token...");
            await auth.signInWithCustomToken(initialAuthToken);
        } else if (!auth.currentUser) {
            // Fallback for environments without custom auth: Sign in anonymously
            console.log("No custom token found, signing in anonymously...");
            await auth.signInAnonymously();
        }

        // 4. Setup Authentication Observer
        setupAuthObserver();
        
    } catch (error) {
        console.error('Firebase Initialization failed:', error);
        // Display generic error on screen if possible (assuming showMessage exists)
        if (typeof showMessage === 'function') {
            showMessage('Authentication Service Error. Please check configuration.', 'error');
        }
        // Ensure loading screen is hidden even on failure
        hideLoadingScreen();
    }
}

// Global message display function (copied from app.js)
function showMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `message ${type}`;
        messageEl.classList.remove('hidden');
        
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
        console.log('User:', user ? user.uid : 'null');
        
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

// Hide loading screen with smooth transition
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
}

// --- Login/Register/Reset Form Handlers (Kept for completeness) ---

// Login Form Handler
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Logging in...';
            submitBtn.disabled = true;
            
            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    showMessage('Login successful! Redirecting...', 'success');
                })
                .catch((error) => {
                    showMessage(error.message, 'error');
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                });
        });
    }
}

// Register Form Handler (Updated to also save settings)
function setupRegisterForm() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const businessName = document.getElementById('register-business-name').value;
            const address = document.getElementById('register-address').value;
            
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Registering...';
            submitBtn.disabled = true;
            
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    console.log('User created:', user.uid);

                    // Save initial business settings
                    const settingsData = {
                        businessName: businessName,
                        address: address,
                        gstin: document.getElementById('register-gstin').value || 'N/A',
                        pan: document.getElementById('register-pan').value || 'N/A',
                        bankDetails: document.getElementById('register-bank-details').value || 'N/A',
                        terms: document.getElementById('register-terms').value || 'Payment due upon receipt. Goods once sold cannot be returned.',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        createdBy: user.uid // Crucial for security rules
                    };

                    return db.collection('settings').doc('business_info').set(settingsData);
                })
                .then(() => {
                    showMessage('Registration successful! Redirecting...', 'success');
                })
                .catch((error) => {
                    showMessage(error.message, 'error');
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

// Toggle between Login/Register/Reset Password forms
function setupFormToggles() {
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login');
    
    // Function to hide all forms
    const hideAllForms = () => {
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('reset-password-form').classList.add('hidden');
    };

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllForms();
            document.getElementById('register-form').classList.remove('hidden');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllForms();
            document.getElementById('login-form').classList.remove('hidden');
        });
    }
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllForms();
            document.getElementById('reset-password-form').classList.remove('hidden');
        });
    }
    
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            hideAllForms();
            document.getElementById('login-form').classList.remove('hidden');
        });
    }
}

// Setup logout buttons function
function setupLogoutButtons() {
    console.log('Setting up logout buttons...');
    
    const logoutButtons = [
        'logout-btn', 'logout-btn-2', 'logout-btn-3', 'logout-btn-4', 'logout-btn-5', 'logout-btn-6'
    ];
    
    logoutButtons.forEach(btnId => {
        const logoutBtn = document.getElementById(btnId);
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (confirm('Are you sure you want to log out?')) {
                    console.log('Logout button clicked:', btnId);
                    auth.signOut().then(() => {
                        showMessage('Logged out successfully', 'success');
                    }).catch((error) => {
                        showMessage('Error logging out: ' + error.message, 'error');
                    });
                }
            });
        }
    });
}

// Initialize authentication functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Auth.js loaded');
    
    // Start the dynamic Firebase initialization process
    initializeFirebase();
    
    // Setup forms if on auth page
    if (isAuthPage()) {
        setupLoginForm();
        setupRegisterForm();
        setupResetPasswordForm();
        setupFormToggles();
    }
    
    // Setup logout buttons if on main app
    if (isAppPage()) {
        setupLogoutButtons();
    }
});
