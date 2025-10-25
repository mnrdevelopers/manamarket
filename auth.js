// --- START Firebase Initialization ---
// NOTE: All applications deployed in this environment MUST use the global variables 
// __firebase_config and __initial_auth_token for secure, authenticated, and persistent storage.

// Retrieve config securely from the environment
let firebaseConfig;
try {
    firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
} catch (e) {
    console.error('Error parsing Firebase config:', e);
    firebaseConfig = {};
}

// Initialize Firebase App
let app, auth, db;
try {
    if (Object.keys(firebaseConfig).length === 0 || !firebaseConfig.apiKey) {
        throw new Error('Firebase config not loaded correctly.');
    }
    
    // Check if app is already initialized (for hot reloads)
    if (!firebase.apps.length) {
        app = firebase.initializeApp(firebaseConfig);
    } else {
        app = firebase.app();
    }
    
    // Initialize services
    auth = firebase.auth(app);
    db = firebase.firestore(app);
    
    // Make auth and db globally accessible for other scripts
    window.auth = auth;
    window.db = db;
    
    // Sign in using the custom token provided by the environment, or anonymously if not available.
    const signIn = async () => {
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        if (initialAuthToken) {
            try {
                await auth.signInWithCustomToken(initialAuthToken);
                console.log('Signed in successfully using custom token.');
            } catch (error) {
                console.error('Error signing in with custom token, signing in anonymously:', error);
                await auth.signInAnonymously();
            }
        } else {
            // Fallback for environments where the token is unavailable
            await auth.signInAnonymously();
        }
    };
    
    // Run the sign-in routine
    signIn().catch(e => console.error("Initial sign-in failed:", e));

} catch (e) {
    console.error('Firebase Initialization failed:', e);
    // Provide generic window objects to prevent script errors in other files
    window.auth = null; 
    window.db = null;
}

// --- END Firebase Initialization ---


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
    // Only run if auth service was successfully initialized
    if (!auth) return;

    auth.onAuthStateChanged((user) => {
        console.log('=== AUTH STATE CHANGED ===');
        console.log('User:', user ? (user.email || user.uid) : 'null');
        
        if (user && !user.isAnonymous) {
            // User is signed in with a persistent account (email/password or custom token)
            console.log('User signed in (Non-Anonymous)');
            
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
        } else if (user && user.isAnonymous) {
            // User is signed in anonymously (from initial load), 
            // only allow access to the auth page or prevent app initialization.
            if (isAppPage()) {
                 console.log('Anonymous user on main app, waiting for sign-in/redirect.');
            } else {
                 console.log('Anonymous user on auth page, ready for login/register.');
                 hideLoadingScreen();
            }
        } else {
            // User is signed out (or token failed)
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
        // Add hidden class for fade out effect
        loadingScreen.classList.add('hidden');
        
        // Remove from DOM after animation completes
        setTimeout(() => {
            loadingScreen.style.display = 'none';
        }, 500);
    }
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

// Registration Form Handler (New)
function setupRegisterForm() {
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // 1. Get user credentials
            const email = document.getElementById('reg-email').value;
            const password = document.getElementById('reg-password').value;
            
            // 2. Get business details
            const businessName = document.getElementById('reg-business-name').value;
            const businessAddress = document.getElementById('reg-business-address').value;
            const gstin = document.getElementById('reg-gstin').value;
            
            // Show loading state
            const submitBtn = e.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Registering...';
            submitBtn.disabled = true;

            try {
                // 3. Create Firebase User
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;
                
                // 4. Save Initial Business Settings
                const settingsData = {
                    businessName: businessName,
                    address: businessAddress,
                    gstin: gstin,
                    terms: 'Custom terms not set. Please update in Settings.',
                    pan: 'N/A', // Assuming PAN is optional/added later
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    createdBy: user.uid
                };
                
                // Save to a dedicated settings document (settings/business_info)
                // Note: The Firestore security rules must allow this write.
                await db.collection('settings').doc('business_info').set(settingsData);
                
                showMessage('Registration successful! Please log in.', 'success');
                
                // Switch back to login form
                document.getElementById('register-form').classList.add('hidden');
                document.getElementById('login-form').classList.remove('hidden');
                
            } catch (error) {
                showMessage(error.message, 'error');
            } finally {
                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
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

// Toggle between Login, Register, and Reset Password forms
function setupFormToggles() {
    const forgotPasswordLink = document.getElementById('forgot-password-link');
    const backToLoginLink = document.getElementById('back-to-login');
    const registerLink = document.getElementById('register-link');
    const backToLoginFromReg = document.getElementById('back-to-login-from-reg');
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('reset-password-form').classList.remove('hidden');
        });
    }
    
    if (backToLoginLink) {
        backToLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('reset-password-form').classList.add('hidden');
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
        });
    }

    if (registerLink) {
        registerLink.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('reset-password-form').classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
        });
    }

    if (backToLoginFromReg) {
        backToLoginFromReg.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('reset-password-form').classList.add('hidden');
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
                
                // IMPORTANT: We use a custom modal or message box instead of confirm()
                if (window.confirm('Are you sure you want to log out?')) {
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
    
    // Setup auth observer first
    setupAuthObserver();
    
    // Setup forms if on auth page
    if (isAuthPage()) {
        setupLoginForm();
        setupRegisterForm(); // Setup new register form
        setupResetPasswordForm();
        setupFormToggles();
    }
    
    // Setup logout buttons if on main app
    if (isAppPage()) {
        setupLogoutButtons();
    }
});
