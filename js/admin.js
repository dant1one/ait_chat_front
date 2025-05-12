import * as authService from './authService.js';
import * as apiService from './apiService.js';

document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated and is admin
    if (!authService.hasToken()) {
        window.location.href = 'login.html';
        return;
    }
    
    const isAdmin = localStorage.getItem('userRole') === 'admin' || localStorage.getItem('is_admin') === 'true';
    if (!isAdmin) {
        alert('Access denied. Admin privileges required.');
        window.location.href = 'chat.html';
        return;
    }

    // Initialize UI elements
    initTabs();
    initButtons();
    
    // Load initial data
    loadMessageLogs();
    loadUserActivity();
    
    // Set up refresh buttons
    document.getElementById('refresh-messages').addEventListener('click', loadMessageLogs);
    document.getElementById('refresh-users').addEventListener('click', loadUserActivity);
    
    // Set up search functionality
    document.getElementById('message-search').addEventListener('input', filterMessages);
    document.getElementById('user-search').addEventListener('input', filterUsers);
    
    // Set up filter dropdowns
    document.getElementById('message-filter').addEventListener('change', filterMessages);
    document.getElementById('user-filter').addEventListener('change', filterUsers);

    // Set up settings form
    document.getElementById('save-settings').addEventListener('click', saveSettings);
    document.getElementById('reset-settings').addEventListener('click', resetSettings);
});

// Tab switching functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            button.classList.add('active');
            const tabId = `${button.dataset.tab}-tab`;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Button initialization
function initButtons() {
    // Back to chat button
    document.getElementById('back-to-chat').addEventListener('click', () => {
        window.location.href = 'chat.html';
    });
    
    // Logout button
    document.getElementById('logout-button').addEventListener('click', () => {
        authService.logout();
    });
}

// Load message logs from API (hardcoded for now)
function loadMessageLogs() {
    const tableBody = document.getElementById('messages-table-body');
    tableBody.innerHTML = '<tr><td colspan="7" class="loading-indicator">Loading messages...</td></tr>';
    
    // In a real implementation, we would fetch this data from an API
    // For now, let's use hardcoded data
    setTimeout(() => {
        const messages = [
            {
                id: 1001,
                type: 'direct',
                sender: 'John Doe',
                sender_id: 101,
                recipient: 'Jane Smith',
                recipient_id: 102,
                content: 'Hey, how are you doing today?',
                timestamp: '2023-05-15T14:30:00Z',
                is_flagged: false
            },
            {
                id: 1002,
                type: 'direct',
                sender: 'Jane Smith',
                sender_id: 102,
                recipient: 'John Doe',
                recipient_id: 101,
                content: 'I\'m doing great! Working on the new project.',
                timestamp: '2023-05-15T14:32:00Z',
                is_flagged: false
            },
            {
                id: 1003,
                type: 'group',
                sender: 'Mike Johnson',
                sender_id: 103,
                recipient: 'Project Team',
                recipient_id: 201,
                content: 'Meeting reminder: Tomorrow at 10am',
                timestamp: '2023-05-15T15:10:00Z',
                is_flagged: false
            },
            {
                id: 1004,
                type: 'direct',
                sender: 'Sarah Wilson',
                sender_id: 104,
                recipient: 'John Doe',
                recipient_id: 101,
                content: 'Please review the documents I sent yesterday',
                timestamp: '2023-05-15T16:05:00Z',
                is_flagged: false
            },
            {
                id: 1005,
                type: 'group',
                sender: 'John Doe',
                sender_id: 101,
                recipient: 'Project Team',
                recipient_id: 201,
                content: 'I\'ll be late for the meeting tomorrow',
                timestamp: '2023-05-15T16:20:00Z',
                is_flagged: false
            },
            {
                id: 1006,
                type: 'direct',
                sender: 'Alice Brown',
                sender_id: 105,
                recipient: 'Bob Green',
                recipient_id: 106,
                content: 'Did you check out that new translation feature?',
                timestamp: '2023-05-15T17:45:00Z',
                is_flagged: false
            },
            {
                id: 1007,
                type: 'direct',
                sender: 'Bob Green',
                sender_id: 106,
                recipient: 'Alice Brown',
                recipient_id: 105,
                content: 'Yes! It works really well. I translated a message from Spanish to English.',
                timestamp: '2023-05-15T17:48:00Z',
                is_flagged: false
            }
        ];
        
        displayMessages(messages);
        updatePagination('messages', 1, 1);
    }, 1000);
}

// Display messages in the table
function displayMessages(messages) {
    const tableBody = document.getElementById('messages-table-body');
    tableBody.innerHTML = '';
    
    if (messages.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-table">No messages found</td></tr>';
        return;
    }
    
    messages.forEach(message => {
        const row = document.createElement('tr');
        
        // Format the timestamp
        const timestamp = new Date(message.timestamp);
        const formattedDate = timestamp.toLocaleDateString();
        const formattedTime = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        row.innerHTML = `
            <td>${message.id}</td>
            <td>
                <span class="status-badge ${message.type === 'direct' ? 'status-active' : 'status-offline'}">
                    ${message.type === 'direct' ? 'Direct' : 'Group'}
                </span>
            </td>
            <td>${message.sender} (${message.sender_id})</td>
            <td>${message.recipient} (${message.recipient_id})</td>
            <td class="message-content">${message.content}</td>
            <td>${formattedDate} ${formattedTime}</td>
            <td>
                <div class="table-actions">
                    <button class="action-button view" title="View Details">👁️</button>
                    <button class="action-button delete" title="Delete Message">🗑️</button>
                    <button class="action-button flag" title="${message.is_flagged ? 'Unflag' : 'Flag'} Message">
                        ${message.is_flagged ? '🚩' : '⚐'}
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Load user activity data (hardcoded for now)
function loadUserActivity() {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '<tr><td colspan="8" class="loading-indicator">Loading users...</td></tr>';
    
    // In a real implementation, we would fetch this data from an API
    // For now, let's use hardcoded data
    setTimeout(() => {
        const users = [
            {
                id: 101,
                username: 'john_doe',
                email: 'john.doe@example.com',
                status: 'online',
                last_seen: new Date(),
                registered: new Date('2023-01-15'),
                message_count: 127
            },
            {
                id: 102,
                username: 'jane_smith',
                email: 'jane.smith@example.com',
                status: 'online',
                last_seen: new Date(),
                registered: new Date('2023-02-10'),
                message_count: 89
            },
            {
                id: 103,
                username: 'mike_johnson',
                email: 'mike.j@example.com',
                status: 'offline',
                last_seen: new Date(Date.now() - 3600000), // 1 hour ago
                registered: new Date('2023-01-20'),
                message_count: 42
            },
            {
                id: 104,
                username: 'sarah_wilson',
                email: 'sarah.w@example.com',
                status: 'offline',
                last_seen: new Date(Date.now() - 86400000), // 1 day ago
                registered: new Date('2023-03-05'),
                message_count: 37
            },
            {
                id: 105,
                username: 'alice_brown',
                email: 'alice.b@example.com',
                status: 'online',
                last_seen: new Date(),
                registered: new Date('2023-04-12'),
                message_count: 28
            },
            {
                id: 106,
                username: 'bob_green',
                email: 'bob.g@example.com',
                status: 'offline',
                last_seen: new Date(Date.now() - 43200000), // 12 hours ago
                registered: new Date('2023-04-18'),
                message_count: 15
            }
        ];
        
        displayUsers(users);
        updatePagination('users', 1, 1);
    }, 1000);
}

// Display users in the table
function displayUsers(users) {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '';
    
    if (users.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" class="empty-table">No users found</td></tr>';
        return;
    }
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // Format dates
        const lastSeen = formatLastSeen(user.last_seen);
        const registered = user.registered.toLocaleDateString();
        
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>
                <span class="status-badge ${user.status === 'online' ? 'status-active' : 'status-offline'}">
                    ${user.status === 'online' ? 'Online' : 'Offline'}
                </span>
            </td>
            <td>${lastSeen}</td>
            <td>${registered}</td>
            <td>${user.message_count}</td>
            <td>
                <div class="table-actions">
                    <button class="action-button edit" title="Edit User">✏️</button>
                    <button class="action-button ban" title="Ban User">🚫</button>
                    <button class="action-button delete" title="Delete User">🗑️</button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Filter messages based on search and filter
function filterMessages() {
    const searchInput = document.getElementById('message-search').value.toLowerCase();
    const filter = document.getElementById('message-filter').value;
    
    const rows = document.querySelectorAll('#messages-table-body tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        if (row.querySelector('.empty-table') || row.querySelector('.loading-indicator')) {
            return;
        }
        
        const type = row.children[1].textContent.trim().toLowerCase();
        const sender = row.children[2].textContent.trim().toLowerCase();
        const recipient = row.children[3].textContent.trim().toLowerCase();
        const content = row.children[4].textContent.trim().toLowerCase();
        
        let matchesFilter = true;
        
        // Apply type filter
        if (filter === 'direct' && type !== 'direct') {
            matchesFilter = false;
        } else if (filter === 'group' && type !== 'group') {
            matchesFilter = false;
        } else if (filter === 'flagged' && !row.querySelector('.flag')?.textContent.includes('🚩')) {
            matchesFilter = false;
        }
        
        // Apply search filter
        const matchesSearch = 
            sender.includes(searchInput) ||
            recipient.includes(searchInput) ||
            content.includes(searchInput);
        
        // Show/hide row based on filters
        if (matchesFilter && matchesSearch) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Show no results message if needed
    if (visibleCount === 0 && rows.length > 0) {
        const tableBody = document.getElementById('messages-table-body');
        if (!tableBody.querySelector('.no-results')) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.className = 'no-results';
            noResultsRow.innerHTML = '<td colspan="7" class="empty-table">No messages match your filters</td>';
            tableBody.appendChild(noResultsRow);
        }
    } else {
        const noResultsRow = document.querySelector('.no-results');
        if (noResultsRow) {
            noResultsRow.remove();
        }
    }
}

// Filter users based on search and filter
function filterUsers() {
    const searchInput = document.getElementById('user-search').value.toLowerCase();
    const filter = document.getElementById('user-filter').value;
    
    const rows = document.querySelectorAll('#users-table-body tr');
    let visibleCount = 0;
    
    rows.forEach(row => {
        if (row.querySelector('.empty-table') || row.querySelector('.loading-indicator')) {
            return;
        }
        
        const username = row.children[1].textContent.trim().toLowerCase();
        const email = row.children[2].textContent.trim().toLowerCase();
        const status = row.children[3].textContent.trim().toLowerCase();
        const lastSeen = row.children[4].textContent.trim().toLowerCase();
        
        let matchesFilter = true;
        
        // Apply type filter
        if (filter === 'online' && status !== 'online') {
            matchesFilter = false;
        } else if (filter === 'offline' && status !== 'offline') {
            matchesFilter = false;
        } else if (filter === 'inactive' && !lastSeen.includes('day')) {
            matchesFilter = false;
        }
        
        // Apply search filter
        const matchesSearch = 
            username.includes(searchInput) ||
            email.includes(searchInput);
        
        // Show/hide row based on filters
        if (matchesFilter && matchesSearch) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Show no results message if needed
    if (visibleCount === 0 && rows.length > 0) {
        const tableBody = document.getElementById('users-table-body');
        if (!tableBody.querySelector('.no-results')) {
            const noResultsRow = document.createElement('tr');
            noResultsRow.className = 'no-results';
            noResultsRow.innerHTML = '<td colspan="8" class="empty-table">No users match your filters</td>';
            tableBody.appendChild(noResultsRow);
        }
    } else {
        const noResultsRow = document.querySelector('.no-results');
        if (noResultsRow) {
            noResultsRow.remove();
        }
    }
}

// Format the "last seen" time in a user-friendly way
function formatLastSeen(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // Difference in seconds
    
    if (diff < 60) {
        return 'Just now';
    } else if (diff < 3600) {
        const minutes = Math.floor(diff / 60);
        return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (diff < 86400) {
        const hours = Math.floor(diff / 3600);
        return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diff / 86400);
        return `${days} day${days !== 1 ? 's' : ''} ago`;
    }
}

// Update pagination controls
function updatePagination(type, currentPage, totalPages) {
    const prevBtn = document.getElementById(type === 'users' ? 'users-prev-page' : 'prev-page');
    const nextBtn = document.getElementById(type === 'users' ? 'users-next-page' : 'next-page');
    const indicator = document.getElementById(type === 'users' ? 'users-page-indicator' : 'page-indicator');
    
    prevBtn.disabled = currentPage <= 1;
    nextBtn.disabled = currentPage >= totalPages;
    indicator.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Add event listeners for pagination buttons
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            // In a real implementation, we would load the previous page of data
            // For now, just update the indicator
            updatePagination(type, currentPage - 1, totalPages);
        }
    };
    
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            // In a real implementation, we would load the next page of data
            // For now, just update the indicator
            updatePagination(type, currentPage + 1, totalPages);
        }
    };
}

// Save admin settings
function saveSettings() {
    const settings = {
        autoModeration: document.getElementById('enable-auto-moderation').checked,
        moderationLevel: document.getElementById('moderation-level').value,
        notifyViolations: document.getElementById('notify-violations').checked,
        maxUploadSize: parseInt(document.getElementById('max-upload-size').value),
        messageHistoryDays: parseInt(document.getElementById('message-history-days').value),
        enableTranslation: document.getElementById('enable-message-translation').checked
    };
    
    // In a real implementation, we would send these settings to the API
    console.log('Saving settings:', settings);
    
    // Show success message
    alert('Settings saved successfully');
}

// Reset settings to defaults
function resetSettings() {
    // Reset checkboxes and select fields
    document.getElementById('enable-auto-moderation').checked = true;
    document.getElementById('moderation-level').value = 'medium';
    document.getElementById('notify-violations').checked = true;
    document.getElementById('max-upload-size').value = 10;
    document.getElementById('message-history-days').value = 30;
    document.getElementById('enable-message-translation').checked = true;
    
    // Show confirmation message
    alert('Settings reset to defaults');
} 