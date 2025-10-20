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

// Enhanced message display function
function showMessage(message, type) {
    const messageEl = document.getElementById('auth-message');
    const messageTextEl = document.getElementById('auth-message-text');
    
    if (messageEl && messageTextEl) {
        messageTextEl.textContent = message;
        messageEl.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
        messageEl.classList.remove('d-none');
        
        // Auto-hide success messages after 3 seconds
        if (type === 'success') {
            setTimeout(() => {
                const bsAlert = new bootstrap.Alert(messageEl);
                bsAlert.close();
            }, 3000);
        }
    }
}

// Setup logout buttons function
function setupLogoutButtons() {
    console.log('Setting up logout buttons...');
    
    const logoutBtn1 = document.getElementById('logout-btn');
    const logoutBtn2 = document.getElementById('logout-btn-2');
    
    if (logoutBtn1) {
        logoutBtn1.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout button 1 clicked');
            auth.signOut().then(() => {
                showMessage('Logged out successfully', 'success');
            }).catch((error) => {
                showMessage('Error logging out: ' + error.message, 'error');
            });
        });
    }
    
    if (logoutBtn2) {
        logoutBtn2.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Logout button 2 clicked');
            auth.signOut().then(() => {
                showMessage('Logged out successfully', 'success');
            }).catch((error) => {
                showMessage('Error logging out: ' + error.message, 'error');
            });
        });
    }
}

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
