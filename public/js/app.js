const API_BASE = '/api';

// State management
let currentUser = null;
let currentItems = [];
let editingItemId = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Check if user is authenticated
async function checkAuth() {
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showApp();
        } else {
            showAuth();
        }
    } catch (error) {
        console.error('Auth check error:', error);
        showAuth();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tab = e.target.dataset.tab;
            switchTab(tab);
        });
    });

    // Forms
    document.getElementById('loginFormElement').addEventListener('submit', handleLogin);
    document.getElementById('registerFormElement').addEventListener('submit', handleRegister);
    document.getElementById('itemForm').addEventListener('submit', handleSaveItem);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('addItemBtn').addEventListener('click', () => openItemModal());
    document.getElementById('cancelBtn').addEventListener('click', closeItemModal);
    document.querySelector('.close').addEventListener('click', closeItemModal);
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('viewAllBtn').addEventListener('click', loadAllItems);
}

// Tab switching
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
    document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
}

// Authentication handlers
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            showMessage('Login successful!', 'success');
            showApp();
        } else {
            showMessage(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            showMessage('Registration successful!', 'success');
            showApp();
        } else {
            showMessage(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showMessage('Network error. Please try again.', 'error');
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        currentUser = null;
        showAuth();
        showMessage('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// UI state management
function showAuth() {
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('appSection').style.display = 'none';
    document.getElementById('userInfo').style.display = 'none';
}

function showApp() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('appSection').style.display = 'block';
    document.getElementById('userInfo').style.display = 'flex';
    
    document.getElementById('userEmail').textContent = currentUser.email;
    document.getElementById('userRole').textContent = currentUser.role.toUpperCase();
    
    // Show admin button if admin
    document.getElementById('viewAllBtn').style.display = 
        currentUser.role === 'admin' ? 'block' : 'none';
    
    loadItems();
}

// Vault item operations
async function loadItems() {
    try {
        const response = await fetch(`${API_BASE}/vault`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            currentItems = data.items;
            renderItems(data.items);
        } else {
            showMessage('Failed to load items', 'error');
        }
    } catch (error) {
        showMessage('Network error', 'error');
    }
}

async function loadAllItems() {
    try {
        const response = await fetch(`${API_BASE}/vault/all`, {
            credentials: 'include'
        });

        if (response.ok) {
            const data = await response.json();
            renderItems(data.items, true);
        } else {
            showMessage('Failed to load all items', 'error');
        }
    } catch (error) {
        showMessage('Network error', 'error');
    }
}

async function handleSearch() {
    const query = document.getElementById('searchInput').value.trim();
    
    if (!query) {
        loadItems();
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/vault/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ query })
        });

        if (response.ok) {
            const data = await response.json();
            renderItems(data.items);
        } else {
            showMessage('Search failed', 'error');
        }
    } catch (error) {
        showMessage('Network error', 'error');
    }
}

function renderItems(items, showOwner = false) {
    const container = document.getElementById('vaultItems');
    
    if (items.length === 0) {
        container.innerHTML = '<p>No vault items found.</p>';
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="vault-item">
            <h3>${escapeHtml(item.name)}</h3>
            <div class="note">${escapeHtml(item.note || '')}</div>
            ${showOwner ? `<div class="meta">Owner: ${escapeHtml(item.owner_email || 'Unknown')}</div>` : ''}
            <div class="meta">Created: ${new Date(item.created_at).toLocaleString()}</div>
            <div class="actions">
                <button class="btn btn-secondary" onclick="editItem(${item.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteItem(${item.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function openItemModal(itemId = null) {
    editingItemId = itemId;
    const modal = document.getElementById('itemModal');
    const form = document.getElementById('itemForm');
    
    document.getElementById('modalTitle').textContent = itemId ? 'Edit Item' : 'Add Item';
    document.getElementById('itemId').value = itemId || '';
    
    if (itemId) {
        const item = currentItems.find(i => i.id === itemId);
        if (item) {
            document.getElementById('itemName').value = item.name;
            document.getElementById('itemNote').value = item.note || '';
        }
    } else {
        form.reset();
    }
    
    modal.style.display = 'block';
}

function closeItemModal() {
    document.getElementById('itemModal').style.display = 'none';
    editingItemId = null;
    document.getElementById('itemForm').reset();
}

async function handleSaveItem(e) {
    e.preventDefault();
    const name = document.getElementById('itemName').value;
    const note = document.getElementById('itemNote').value;
    const itemId = editingItemId;

    try {
        const url = itemId ? `${API_BASE}/vault/${itemId}` : `${API_BASE}/vault`;
        const method = itemId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, note })
        });

        const data = await response.json();

        if (response.ok) {
            showMessage(itemId ? 'Item updated successfully' : 'Item created successfully', 'success');
            closeItemModal();
            loadItems();
        } else {
            showMessage(data.error || 'Failed to save item', 'error');
        }
    } catch (error) {
        showMessage('Network error', 'error');
    }
}

async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/vault/${itemId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (response.ok) {
            showMessage('Item deleted successfully', 'success');
            loadItems();
        } else {
            const data = await response.json();
            showMessage(data.error || 'Failed to delete item', 'error');
        }
    } catch (error) {
        showMessage('Network error', 'error');
    }
}

function editItem(itemId) {
    openItemModal(itemId);
}

// Utility functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type = 'success') {
    const messageEl = document.getElementById('message');
    messageEl.textContent = message;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';

    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 3000);
}

