 // Configuration
        const API_URL = 'https://script.google.com/macros/s/AKfycbyywQhgMQhceoDhRLU-DgRtyG9Mx_a3AJW1dYJCTn8kz4M1CU2lX-gOelT5FzOt1Unvtg/exec';
        let isAdmin = false;
        
        // DOM Elements
        const publicView = document.getElementById('public-view');
        const loginForm = document.getElementById('login-form');
        const adminPanel = document.getElementById('admin-panel');
        const adminLoginBtn = document.getElementById('admin-login-btn');
        const loginBtn = document.getElementById('login-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        // Initialize the page
        document.addEventListener('DOMContentLoaded', function() {
            loadProducts();
            
            // Check if we're coming back from a login
            if (sessionStorage.getItem('adminLoggedIn') === 'true') {
                showAdminPanel();
                loadAdminProducts();
            }
            
            // Event listeners
            adminLoginBtn.addEventListener('click', showLoginForm);
            loginBtn.addEventListener('click', attemptLogin);
            logoutBtn.addEventListener('click', logout);
        });
        
        // Public product loading
        function loadProducts() {
            fetch(`${API_URL}?getProducts=true`)
                .then(response => response.json())
                .then(products => {
                    const container = document.getElementById('products-container');
                    
                    if (products.length === 0) {
                        container.innerHTML = '<div class="no-products">No products available.</div>';
                        return;
                    }
                    
                    let html = '<div class="products">';
                    
                    products.forEach(product => {
                        const discount = Math.round(((product.original_price - product.price) / product.original_price) * 100);
                        
                        html += `
                            <div class="product-card">
                                <img src="${product.image}" alt="${product.title}" class="product-image">
                                <div class="product-title">${product.title}</div>
                                <div class="price">₹${product.price} 
                                    <span class="original-price">₹${product.original_price}</span> 
                                    <span class="discount">(${discount}% off)</span>
                                </div>
                                <div>
                                    <span class="platform-tag ${product.platform}-tag">
                                        ${product.platform.charAt(0).toUpperCase() + product.platform.slice(1)}
                                    </span>
                                </div>
                                <a href="${product.affiliate_url}" class="buy-button ${product.platform === 'flipkart' ? 'flipkart-btn' : ''}" target="_blank">Buy Now</a>
                            </div>
                        `;
                    });
                    
                    html += '</div>';
                    container.innerHTML = html;
                })
                .catch(error => {
                    console.error('Error loading products:', error);
                    document.getElementById('products-container').innerHTML = 
                        '<div class="error">Failed to load products. Please try again later.</div>';
                });
        }
        
        // Admin functions
        function showLoginForm() {
            publicView.style.display = 'none';
            loginForm.style.display = 'block';
            adminPanel.style.display = 'none';
        }
        
        function attemptLogin() {
            const password = document.getElementById('admin-password').value;
            
            // In a real app, you would hash this before sending
            fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "verifyPassword",
                    password: password
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (!data.error) {
                    sessionStorage.setItem('adminLoggedIn', 'true');
                    showAdminPanel();
                    loadAdminProducts();
                } else {
                    document.getElementById('login-error').style.display = 'block';
                }
            });
        }
        
        function showAdminPanel() {
            publicView.style.display = 'none';
            loginForm.style.display = 'none';
            adminPanel.style.display = 'block';
            
            // Set up form submission
            document.getElementById('add-product-btn').addEventListener('click', addNewProduct);
        }
        
        function logout() {
            sessionStorage.removeItem('adminLoggedIn');
            location.reload();
        }
        
        function loadAdminProducts() {
            fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "getProductsForAdmin",
                    password: sessionStorage.getItem('adminPassword')
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(products => {
                const container = document.getElementById('admin-products-container');
                
                if (products.length === 0) {
                    container.innerHTML = '<div class="no-products">No products found.</div>';
                    return;
                }
                
                let html = '<div class="products">';
                
                products.forEach(product => {
                    html += `
                        <div class="product-card">
                            <img src="${product.image}" alt="${product.title}" style="width: 100px; height: auto;">
                            <h4>${product.title}</h4>
                            <p>Price: ₹${product.price} (Was ₹${product.original_price})</p>
                            <p>Platform: ${product.platform}</p>
                            <a href="${product.affiliate_url}" target="_blank">View Product</a>
                        </div>
                    `;
                });
                
                html += '</div>';
                container.innerHTML = html;
            });
        }
        
        function addNewProduct() {
            const title = document.getElementById('product-title').value;
            const image = document.getElementById('product-image').value;
            const url = document.getElementById('product-url').value;
            const price = document.getElementById('product-price').value;
            const originalPrice = document.getElementById('product-original-price').value;
            const platform = document.getElementById('product-platform').value;
            
            // Simple validation
            if (!title || !image || !url || !price || !originalPrice) {
                document.getElementById('form-message').textContent = 'Please fill all fields';
                document.getElementById('form-message').style.color = 'red';
                return;
            }
            
            fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: "addProduct",
                    password: sessionStorage.getItem('adminPassword'),
                    product: {
                        title: title,
                        image: image,
                        affiliate_url: url,
                        price: price,
                        original_price: originalPrice,
                        platform: platform
                    }
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    document.getElementById('form-message').textContent = 'Product added successfully!';
                    document.getElementById('form-message').style.color = 'green';
                    
                    // Clear form
                    document.getElementById('product-title').value = '';
                    document.getElementById('product-image').value = '';
                    document.getElementById('product-url').value = '';
                    document.getElementById('product-price').value = '';
                    document.getElementById('product-original-price').value = '';
                    
                    // Refresh product list
                    loadAdminProducts();
                    loadProducts(); // Refresh public view
                }
            })
            .catch(error => {
                document.getElementById('form-message').textContent = 'Error adding product';
                document.getElementById('form-message').style.color = 'red';
            });
        }
