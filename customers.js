// --- Customer Management System ---

let currentCustomers = [];
let currentEditingCustomerId = null;

// Safe access to auth and db (defined in auth.js)
function getAuth() {
    return window.auth || { currentUser: null };
}
function getDb() {
    return window.db;
}

// ----------------------------------------------------
// Core Initialization
// ----------------------------------------------------

function initCustomersPage() {
    console.log('Initializing Customer Management Page...');
    
    // Setup event listeners for the page
    setupCustomerEventListeners();
    
    // Load existing customers
    loadAllCustomers();
}

function setupCustomerEventListeners() {
    const addCustomerBtn = document.getElementById('add-customer-btn');
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', showAddCustomerModal);
    }

    const searchInput = document.getElementById('search-customers');
    if (searchInput) {
        let timeoutId;
        searchInput.addEventListener('input', function(e) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                filterCustomers(e.target.value);
            }, 300);
        });
    }
    
    // Modal Event Listeners (defined in app.js setupGlobalModalHandlers)
    document.getElementById('save-customer-btn').addEventListener('click', saveCustomer);
}
// ----------------------------------------------------
// Data Loading and Display
// ----------------------------------------------------

function loadAllCustomers(searchTerm = '') {
    const user = getAuth().currentUser;
    const tableBody = document.getElementById('customers-table-body');
    if (!user || !tableBody) {
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="no-customers-found">Please log in to manage customers.</td></tr>';
        return;
    }

    tableBody.innerHTML = '<tr><td colspan="4" class="loading-invoices">Loading customers...</td></tr>';
    
    // In a real app, you would use Firestore query if performance required it.
    // For simplicity, we fetch and filter locally if a search term is present.
    
    let queryRef = getDb().collection('customers').where('createdBy', '==', user.uid);
    
    queryRef.get()
        .then(querySnapshot => {
            currentCustomers = [];
            querySnapshot.forEach(doc => {
                currentCustomers.push({ id: doc.id, ...doc.data() });
            });
            
            // Apply sorting (by name)
            currentCustomers.sort((a, b) => a.name.localeCompare(b.name));

            displayCustomersTable(searchTerm);
            console.log(`Loaded ${currentCustomers.length} total customers.`);
        })
        .catch(error => {
            console.error('Error loading customers:', error);
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="no-customers-found">Error loading customers.</td></tr>';
            showMessage('Error loading customers: ' + error.message, 'error');
        });
}

function displayCustomersTable(searchTerm) {
    const tableBody = document.getElementById('customers-table-body');
    if (!tableBody) return;
    
    const filter = searchTerm ? searchTerm.toLowerCase() : '';
    const customersToDisplay = currentCustomers.filter(customer =>
        customer.name.toLowerCase().includes(filter) ||
        customer.mobile.includes(filter)
    );

    if (customersToDisplay.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="no-customers-found">No customers found.</td></tr>';
        return;
    }

    let tableHTML = '';
    customersToDisplay.forEach(customer => {
        const addressPreview = customer.address ? 
            customer.address.substring(0, 40) + (customer.address.length > 40 ? '...' : '') : 
            'N/A';
            
        tableHTML += `
            <tr>
                <td>${customer.name}</td>
                <td>${customer.mobile}</td>
                <td>${addressPreview}</td>
                <td class="invoice-actions-cell">
                    <button class="btn-edit edit-customer" data-id="${customer.id}">Edit</button>
                    <button class="btn-delete delete-customer" data-id="${customer.id}">Delete</button>
                </td>
            </tr>
        `;
    });
    
    tableBody.innerHTML = tableHTML;
    
    // Re-attach action listeners
    document.querySelectorAll('.edit-customer').forEach(btn => {
        btn.addEventListener('click', function() { editCustomer(this.getAttribute('data-id')); });
    });
    document.querySelectorAll('.delete-customer').forEach(btn => {
        btn.addEventListener('click', function() { deleteCustomer(this.getAttribute('data-id'), btn); });
    });
}

function filterCustomers(searchTerm) {
    displayCustomersTable(searchTerm);
}

// ----------------------------------------------------
// CRUD Operations
// ----------------------------------------------------

function showAddCustomerModal() {
    currentEditingCustomerId = null;
    document.getElementById('customer-modal-title').textContent = 'Add New Customer';
    document.getElementById('customer-form').reset();
    document.getElementById('customer-modal').classList.remove('hidden');
}

function editCustomer(customerId) {
    const customer = currentCustomers.find(c => c.id === customerId);
    if (!customer) return showMessage('Customer not found.', 'error');
    
    currentEditingCustomerId = customerId;
    document.getElementById('customer-modal-title').textContent = 'Edit Customer';
    
    document.getElementById('customer-modal-name').value = customer.name || '';
    document.getElementById('customer-modal-mobile').value = customer.mobile || '';
    document.getElementById('customer-modal-address').value = customer.address || '';

    document.getElementById('customer-modal').classList.remove('hidden');
}

function saveCustomer(e) {
    if (e) e.preventDefault();
    
    const user = getAuth().currentUser;
    if (!user) {
        showMessage('Please log in to save customers', 'error');
        return;
    }
    
    const customerData = {
        name: document.getElementById('customer-modal-name').value.trim(),
        mobile: document.getElementById('customer-modal-mobile').value.trim(),
        address: document.getElementById('customer-modal-address').value.trim(),
        createdBy: user.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    if (!customerData.name || !customerData.mobile) {
        showMessage('Name and Mobile are required.', 'error');
        return;
    }
    
    // Handle loading state
    const saveBtn = document.getElementById('save-customer-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;

    let promise;
    
    if (currentEditingCustomerId) {
        // Update existing customer
        promise = getDb().collection('customers').doc(currentEditingCustomerId).update(customerData);
    } else {
        // Add new customer - include createdAt
        customerData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        promise = getDb().collection('customers').add(customerData);
    }
    
    promise
        .then(() => {
            const action = currentEditingCustomerId ? 'updated' : 'added';
            showMessage(`Customer ${action} successfully!`, 'success');
            document.getElementById('customer-modal').classList.add('hidden');
            loadAllCustomers(); // Reload list
            
            // Also update the cache for the invoice form
            if (typeof loadCustomerCache === 'function') {
                loadCustomerCache();
            }
        })
        .catch(error => {
            showMessage(`Error saving customer: ${error.message}`, 'error');
            console.error('Error saving customer:', error);
        })
        .finally(() => {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        });
}

function deleteCustomer(customerId, button) {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
        return;
    }
    
    // Add loading state to button
    const originalText = button.textContent;
    button.textContent = 'Deleting...';
    button.disabled = true;
    
    getDb().collection('customers').doc(customerId).delete()
        .then(() => {
            showMessage('Customer deleted successfully!', 'success');
            loadAllCustomers(); // Reload list
        })
        .catch(error => {
            showMessage('Error deleting customer: ' + error.message, 'error');
            console.error('Error deleting customer:', error);
            button.textContent = originalText;
            button.disabled = false;
        });
}

// Make initCustomersPage globally accessible for app.js to call
window.initCustomersPage = initCustomersPage;
window.loadAllCustomers = loadAllCustomers;
