// --- Settings Management System ---

// Global variable to store current settings (for immediate access in invoice preview)
window.currentSettings = null;

// Safe access to auth and db (defined in auth.js)
function getAuth() {
    return window.auth || { currentUser: null };
}
function getDb() {
    return window.db;
}

const SETTINGS_DOC_ID = 'business_info';

// ----------------------------------------------------
// Core Initialization and Event Setup
// ----------------------------------------------------

function initSettingsPage() {
    console.log('Initializing Settings Page...');
    setupSettingsEventListeners();
    loadSettings();
}

function setupSettingsEventListeners() {
    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', saveSettings);
    }
}

// ----------------------------------------------------
// Data Loading
// ----------------------------------------------------

async function loadSettings() {
    const user = getAuth().currentUser;
    if (!user) return;
    
    const settingsForm = document.getElementById('settings-form');
    if (!settingsForm) return;

    // Show loading indicator
    settingsForm.classList.add('form-loading');
    
    try {
        const docRef = getDb().collection('settings').doc(SETTINGS_DOC_ID);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            window.currentSettings = data;
            
            // Populate the form fields
            document.getElementById('setting-business-name').value = data.businessName || 'BILLA TRADERS';
            document.getElementById('setting-gstin').value = data.gstin || '';
            document.getElementById('setting-pan').value = data.pan || '';
            document.getElementById('setting-bank-details').value = data.bankDetails || '';
            document.getElementById('setting-address').value = data.address || 'DICHPALLY RS, HYD-NZB ROAD, NIZAMABAD TELANGANA 503175';
            document.getElementById('setting-terms').value = data.terms || '1. Goods once sold cannot be taken back. 2. Payment due within 30 days. 3. Disputes subject to Nizamabad jurisdiction.';

            console.log('Settings loaded successfully.');
        } else {
            console.log('No custom settings found, using defaults.');
            // Initialize with hardcoded defaults if document doesn't exist
            document.getElementById('setting-business-name').value = 'BILLA TRADERS';
            document.getElementById('setting-address').value = 'DICHPALLY RS, HYD-NZB ROAD, NIZAMABAD TELANGANA 503175';
            document.getElementById('setting-terms').value = '1. Goods once sold cannot be taken back. 2. Payment due within 30 days. 3. Disputes subject to Nizamabad jurisdiction.';
            window.currentSettings = {
                businessName: 'BILLA TRADERS',
                address: 'DICHPALLY RS, HYD-NZB ROAD, NIZAMABAD TELANGANA 503175',
                terms: '1. Goods once sold cannot be taken back. 2. Payment due within 30 days. 3. Disputes subject to Nizamabad jurisdiction.'
            };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showMessage('Error loading settings: ' + error.message, 'error');
    } finally {
        settingsForm.classList.remove('form-loading');
    }
}

// ----------------------------------------------------
// Data Saving
// ----------------------------------------------------

function saveSettings(e) {
    if (e) e.preventDefault();
    
    const user = getAuth().currentUser;
    if (!user) {
        showMessage('Please log in to save settings', 'error');
        return;
    }
    
    const settingsData = {
        businessName: document.getElementById('setting-business-name').value.trim(),
        gstin: document.getElementById('setting-gstin').value.trim(),
        pan: document.getElementById('setting-pan').value.trim(),
        bankDetails: document.getElementById('setting-bank-details').value.trim(),
        address: document.getElementById('setting-address').value.trim(),
        terms: document.getElementById('setting-terms').value.trim(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        // Since this is business-wide, we assume one settings doc per app/user
        createdBy: user.uid 
    };

    if (!settingsData.businessName || !settingsData.address || !settingsData.terms) {
        showMessage('Business Name, Address, and Terms are required.', 'error');
        return;
    }
    
    // Handle loading state
    const saveBtn = document.getElementById('save-settings-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    // Use set with merge true to create/update the single settings document
    getDb().collection('settings').doc(SETTINGS_DOC_ID).set(settingsData, { merge: true })
        .then(() => {
            showMessage('Settings saved successfully!', 'success');
            // Update the global cache immediately
            window.currentSettings = settingsData;
            console.log('Global settings cache updated.');
        })
        .catch(error => {
            showMessage('Error saving settings: ' + error.message, 'error');
            console.error('Error saving settings:', error);
        })
        .finally(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        });
}

// Make loadSettings and initSettingsPage globally accessible for app.js to call
window.loadSettings = loadSettings;
window.initSettingsPage = initSettingsPage;
