/**
 * Admin UI Service
 * Handles UI interactions and DOM updates for the admin panel
 */
class AdminUI {
    constructor() {
        this.currentView = 'dashboard';
        this.initViewSwitching();
    }

    /**
     * Initialize view switching functionality
     */
    initViewSwitching() {
        // Setup navigation links
        document.getElementById('dashboard-link').addEventListener('click', () => this.switchView('dashboard'));
        document.getElementById('users-link').addEventListener('click', () => this.switchView('users'));
        document.getElementById('groups-link').addEventListener('click', () => this.switchView('groups'));
        document.getElementById('messages-link').addEventListener('click', () => this.switchView('messages'));
        document.getElementById('system-link').addEventListener('click', () => this.switchView('system'));
    }

    /**
     * Switch between different views
     */
    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.content-view').forEach(view => {
            view.style.display = 'none';
        });

        // Show the selected view
        document.getElementById(`${viewName}-view`).style.display = 'block';

        // Update active navigation link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.getElementById(`${viewName}-link`).classList.add('active');

        // Update current view
        this.currentView = viewName;

        // Trigger view-specific initialization if needed
        if (viewName === 'dashboard') {
            this.initDashboard();
        } else if (viewName === 'users') {
            this.initUsersView();
        } else if (viewName === 'groups') {
            this.initGroupsView();
        } else if (viewName === 'messages') {
            this.initMessagesView();
        } else if (viewName === 'system') {
            this.initSystemView();
        }
    }

    /**
     * Initialize dashboard view
     */
    async initDashboard() {
        try {
            // Load all dashboard data
            const userStats = await adminService.getUserStats();
            const messageStats = await adminService.getMessageStats();
            const groupStats = await adminService.getGroupStats();

            // Update stats cards
            document.getElementById('total-users').textContent = userStats.total_users;
            document.getElementById('new-users').textContent = userStats.new_users_last_7_days;
            document.getElementById('online-users').textContent = userStats.online_users;
            document.getElementById('active-users').textContent = userStats.active_users_last_24h;
            
            document.getElementById('total-messages').textContent = messageStats.total_messages;
            document.getElementById('media-messages').textContent = messageStats.media_messages;
            
            document.getElementById('total-groups').textContent = groupStats.total_groups;
            document.getElementById('active-groups').textContent = groupStats.active_groups_last_24h;

            // Update active users table
            const activeUsersTable = document.getElementById('active-users-table');
            activeUsersTable.innerHTML = '';
            
            if (userStats.most_active_users.length === 0) {
                activeUsersTable.innerHTML = '<tr><td colspan="3" class="text-center">No active users found</td></tr>';
            } else {
                userStats.most_active_users.forEach(user => {
                    activeUsersTable.innerHTML += `
                        <tr>
                            <td>${user.username}</td>
                            <td>${user.message_count}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary view-user-btn" data-user-id="${user.id}">
                                    View
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            // Update active groups table
            const activeGroupsTable = document.getElementById('active-groups-table');
            activeGroupsTable.innerHTML = '';
            
            if (groupStats.most_active_groups.length === 0) {
                activeGroupsTable.innerHTML = '<tr><td colspan="4" class="text-center">No active groups found</td></tr>';
            } else {
                groupStats.most_active_groups.forEach(group => {
                    activeGroupsTable.innerHTML += `
                        <tr>
                            <td>${group.name}</td>
                            <td>${group.members_count}</td>
                            <td>${group.message_count}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-primary view-group-btn" data-group-id="${group.id}">
                                    View
                                </button>
                            </td>
                        </tr>
                    `;
                });
            }

            // Attach event listeners to view buttons
            document.querySelectorAll('.view-user-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const userId = e.target.getAttribute('data-user-id');
                    this.showUserDetail(userId);
                });
            });

            document.querySelectorAll('.view-group-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const groupId = e.target.getAttribute('data-group-id');
                    this.showGroupDetail(groupId);
                });
            });

            // Initialize message activity chart
            adminCharts.initMessageActivityChart(messageStats.messages_per_day);

            // Add event listener to refresh button
            document.getElementById('refresh-stats').addEventListener('click', () => {
                this.initDashboard();
            });
            
            // Clean up tokens button
            document.getElementById('cleanup-tokens').addEventListener('click', async () => {
                try {
                    const result = await adminService.cleanupTokens();
                    alert(`Token cleanup completed: ${result.message}`);
                } catch (error) {
                    alert('Failed to clean up tokens: ' + error.message);
                }
            });

        } catch (error) {
            console.error('Error initializing dashboard:', error);
            alert('Failed to load dashboard data. Please check console for details.');
        }
    }

    /**
     * Initialize users view
     */
    async initUsersView() {
        try {
            const users = await adminService.getUsers();
            this.renderUsersTable(users);
            
            // Set up search functionality
            const searchInput = document.getElementById('user-search');
            const searchButton = document.getElementById('search-user-btn');
            
            searchButton.addEventListener('click', async () => {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) {
                    const searchResults = await adminService.getUsers(1, 20, searchTerm);
                    this.renderUsersTable(searchResults);
                }
            });
            
            // Allow search on Enter key
            searchInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    searchButton.click();
                }
            });
            
            // Load more button
            document.getElementById('load-more-users').addEventListener('click', async () => {
                const currentCount = document.querySelectorAll('#users-table tr').length - 1; // Subtract header row
                const page = Math.floor(currentCount / 20) + 1;
                const searchTerm = searchInput.value.trim();
                
                const moreUsers = await adminService.getUsers(page, 20, searchTerm);
                this.renderUsersTable(moreUsers, true);
            });
            
        } catch (error) {
            console.error('Error initializing users view:', error);
            document.getElementById('users-table').innerHTML = `
                <tr><td colspan="7" class="text-center text-danger">
                    Error loading users: ${error.message}
                </td></tr>
            `;
        }
    }
    
    /**
     * Render users table
     */
    renderUsersTable(users, append = false) {
        const usersTable = document.getElementById('users-table');
        
        if (!append) {
            usersTable.innerHTML = '';
        }
        
        if (!users || users.length === 0) {
            if (!append) {
                usersTable.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
            }
            return;
        }
        
        users.forEach(user => {
            const statusBadge = user.is_online 
                ? '<span class="badge bg-success">Online</span>' 
                : '<span class="badge bg-secondary">Offline</span>';
                
            const lastSeen = new Date(user.last_seen).toLocaleString();
            const registered = new Date(user.registered_at).toLocaleDateString();
            
            usersTable.innerHTML += `
                <tr>
                    <td>${user.id}</td>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${statusBadge}</td>
                    <td>${lastSeen}</td>
                    <td>${registered}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary view-user-detail" data-user-id="${user.id}">
                            View
                        </button>
                    </td>
                </tr>
            `;
        });
        
        // Update showing counter
        const totalRows = document.querySelectorAll('#users-table tr').length - 1; // Subtract header row
        document.getElementById('users-showing').textContent = totalRows;
        document.getElementById('users-total').textContent = users.total || totalRows;
        
        // Attach event listeners to view buttons
        document.querySelectorAll('.view-user-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const userId = e.target.getAttribute('data-user-id');
                this.showUserDetail(userId);
            });
        });
    }
    
    /**
     * Show user detail modal
     */
    async showUserDetail(userId) {
        const modal = new bootstrap.Modal(document.getElementById('user-detail-modal'));
        modal.show();
        
        const contentEl = document.getElementById('user-detail-content');
        contentEl.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading user details...</p>
            </div>
        `;
        
        try {
            const userData = await adminService.getUserActivity(userId);
            
            // Format the data
            const lastSeen = new Date(userData.last_seen).toLocaleString();
            const registered = new Date(userData.registered_at).toLocaleString();
            
            // Create message activity chart data
            const chartData = {
                labels: userData.messages_per_day.map(item => item.date),
                data: userData.messages_per_day.map(item => item.total)
            };
            
            contentEl.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h4>${userData.username}</h4>
                        <p class="text-muted">${userData.email}</p>
                        
                        <div class="mb-4">
                            <h5>User Information</h5>
                            <ul class="list-group">
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Status:</span>
                                    <span>${userData.is_online ? 'Online' : 'Offline'}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Last Seen:</span>
                                    <span>${lastSeen}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Registered:</span>
                                    <span>${registered}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Contacts:</span>
                                    <span>${userData.contact_count}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Group Memberships:</span>
                                    <span>${userData.group_memberships}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="mb-4">
                            <h5>Message Statistics</h5>
                            <ul class="list-group">
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Direct Messages:</span>
                                    <span>${userData.direct_messages_sent}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Group Messages:</span>
                                    <span>${userData.group_messages_sent}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Total Messages:</span>
                                    <span>${userData.total_messages_sent}</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div>
                            <h5>Message Activity (Last 7 Days)</h5>
                            <canvas id="user-activity-chart" height="200"></canvas>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize the chart
            setTimeout(() => {
                const ctx = document.getElementById('user-activity-chart').getContext('2d');
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: 'Messages',
                            data: chartData.data,
                            backgroundColor: 'rgba(54, 162, 235, 0.2)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 2,
                            tension: 0.3,
                            pointRadius: 4
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            }
                        }
                    }
                });
            }, 100);
            
        } catch (error) {
            console.error(`Error fetching user details for user ${userId}:`, error);
            contentEl.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load user details: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Initialize groups view
     */
    async initGroupsView() {
        try {
            const groupsData = await adminService.getGroups();
            this.renderGroupsTable(groupsData);
            
            // Set up search functionality
            const searchInput = document.getElementById('group-search');
            const searchButton = document.getElementById('search-group-btn');
            
            searchButton.addEventListener('click', async () => {
                const searchTerm = searchInput.value.trim();
                if (searchTerm) {
                    const searchResults = await adminService.getGroups(1, 20, searchTerm);
                    this.renderGroupsTable(searchResults);
                }
            });
            
            // Allow search on Enter key
            searchInput.addEventListener('keypress', async (e) => {
                if (e.key === 'Enter') {
                    searchButton.click();
                }
            });
            
            // Load more button
            document.getElementById('load-more-groups').addEventListener('click', async () => {
                const currentCount = document.querySelectorAll('#groups-table tr').length - 1; // Subtract header row
                const page = Math.floor(currentCount / 20) + 1;
                const searchTerm = searchInput.value.trim();
                
                const moreGroups = await adminService.getGroups(page, 20, searchTerm);
                this.renderGroupsTable(moreGroups, true);
            });
            
        } catch (error) {
            console.error('Error initializing groups view:', error);
            document.getElementById('groups-table').innerHTML = `
                <tr><td colspan="5" class="text-center text-danger">
                    Error loading groups: ${error.message}
                </td></tr>
            `;
        }
    }
    
    /**
     * Render groups table
     */
    renderGroupsTable(groupsData, append = false) {
        const groupsTable = document.getElementById('groups-table');
        const groups = groupsData.groups || groupsData;
        
        if (!append) {
            groupsTable.innerHTML = '';
        }
        
        if (!groups || groups.length === 0) {
            if (!append) {
                groupsTable.innerHTML = '<tr><td colspan="5" class="text-center">No groups found</td></tr>';
            }
            return;
        }
        
        groups.forEach(group => {
            // Count group members if available
            const membersCount = group.members?.length || '-';
            
            // Count messages - this might need to be fetched separately
            const messagesCount = '-'; // Placeholder
            
            groupsTable.innerHTML += `
                <tr>
                    <td>${group.id}</td>
                    <td>${group.group_name}</td>
                    <td>${membersCount}</td>
                    <td>${messagesCount}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary view-group-detail" data-group-id="${group.id}">
                            View
                        </button>
                    </td>
                </tr>
            `;
        });
        
        // Update showing counter
        const totalRows = document.querySelectorAll('#groups-table tr').length - 1; // Subtract header row
        document.getElementById('groups-showing').textContent = totalRows;
        document.getElementById('groups-total').textContent = groupsData.total || totalRows;
        
        // Attach event listeners to view buttons
        document.querySelectorAll('.view-group-detail').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const groupId = e.target.getAttribute('data-group-id');
                this.showGroupDetail(groupId);
            });
        });
    }
    
    /**
     * Show group detail modal
     */
    async showGroupDetail(groupId) {
        const modal = new bootstrap.Modal(document.getElementById('group-detail-modal'));
        modal.show();
        
        const contentEl = document.getElementById('group-detail-content');
        contentEl.innerHTML = `
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading group details...</p>
            </div>
        `;
        
        try {
            const groupData = await adminService.getGroupActivity(groupId);
            
            // Create message activity chart data
            const chartData = {
                labels: groupData.messages_per_day.map(item => item.date),
                data: groupData.messages_per_day.map(item => item.message_count)
            };
            
            contentEl.innerHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h4>${groupData.group_name}</h4>
                        <p class="text-muted">${groupData.description || 'No description'}</p>
                        
                        <div class="mb-4">
                            <h5>Group Information</h5>
                            <ul class="list-group">
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Members:</span>
                                    <span>${groupData.member_count}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between">
                                    <span>Total Messages:</span>
                                    <span>${groupData.message_count}</span>
                                </li>
                            </ul>
                        </div>
                        
                        <div class="mb-4">
                            <h5>Most Active Members</h5>
                            <ul class="list-group">
                                ${groupData.most_active_users.map(user => `
                                    <li class="list-group-item d-flex justify-content-between align-items-center">
                                        ${user.username}
                                        <span class="badge bg-primary rounded-pill">${user.message_count}</span>
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div>
                            <h5>Message Activity (Last 7 Days)</h5>
                            <canvas id="group-activity-chart" height="250"></canvas>
                        </div>
                    </div>
                </div>
            `;
            
            // Initialize the chart
            setTimeout(() => {
                const ctx = document.getElementById('group-activity-chart').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: chartData.labels,
                        datasets: [{
                            label: 'Messages',
                            data: chartData.data,
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    precision: 0
                                }
                            }
                        }
                    }
                });
            }, 100);
            
        } catch (error) {
            console.error(`Error fetching group details for group ${groupId}:`, error);
            contentEl.innerHTML = `
                <div class="alert alert-danger">
                    Failed to load group details: ${error.message}
                </div>
            `;
        }
    }

    /**
     * Initialize messages view
     */
    initMessagesView() {
        adminCharts.initMessageVolumeChart();
        adminCharts.initMessageTypesChart();
        adminCharts.initMediaTypesChart();
        adminCharts.initBusiestHoursChart();

        // Add event listeners for period buttons
        document.querySelectorAll('.btn-group[data-period] .btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Remove active class from all buttons
                e.target.parentElement.querySelectorAll('.btn').forEach(b => {
                    b.classList.remove('active');
                });
                
                // Add active class to clicked button
                e.target.classList.add('active');
                
                // Update charts based on selected period
                const period = e.target.getAttribute('data-period');
                adminCharts.updateChartPeriod(period);
            });
        });
    }

    /**
     * Initialize system view
     */
    initSystemView() {
        // Display system storage type
        document.getElementById('system-storage-type').textContent = 
            localStorage.getItem('storage-type') || 'Local';
        
        // Add event listener for cleanup tokens button
        document.getElementById('system-cleanup-tokens').addEventListener('click', async () => {
            try {
                const result = await adminService.cleanupTokens();
                alert(`Token cleanup completed: ${result.message}`);
            } catch (error) {
                alert('Failed to clean up tokens: ' + error.message);
            }
        });
        
        // Add event listener for clear cache button
        document.getElementById('clear-cache').addEventListener('click', () => {
            const confirmed = confirm('Are you sure you want to clear the application cache?');
            if (confirmed) {
                localStorage.clear();
                sessionStorage.clear();
                alert('Cache cleared successfully. The page will now reload.');
                window.location.reload();
            }
        });
        
        // Check API status
        fetch(`${window.location.protocol}//${window.location.hostname}:8000/users/me`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            const apiStatus = document.getElementById('api-status');
            if (response.ok) {
                apiStatus.textContent = 'Online';
                apiStatus.className = 'badge bg-success';
            } else {
                apiStatus.textContent = 'Issues Detected';
                apiStatus.className = 'badge bg-warning';
            }
        })
        .catch(() => {
            const apiStatus = document.getElementById('api-status');
            apiStatus.textContent = 'Offline';
            apiStatus.className = 'badge bg-danger';
        });

        // Check WebSocket status
        const wsStatus = document.getElementById('ws-status');
        if (window.WebSocket) {
            try {
                const ws = new WebSocket(`ws://${window.location.hostname}:8000/ws?token=${localStorage.getItem('token')}`);
                
                ws.onopen = () => {
                    wsStatus.textContent = 'Online';
                    wsStatus.className = 'badge bg-success';
                    setTimeout(() => ws.close(), 1000); // Close after checking
                };
                
                ws.onerror = () => {
                    wsStatus.textContent = 'Error';
                    wsStatus.className = 'badge bg-danger';
                };
            } catch (error) {
                wsStatus.textContent = 'Error';
                wsStatus.className = 'badge bg-danger';
            }
        } else {
            wsStatus.textContent = 'Not Supported';
            wsStatus.className = 'badge bg-secondary';
        }
    }
}

// Create a singleton instance
const adminUI = new AdminUI();