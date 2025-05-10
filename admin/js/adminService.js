/**
 * Admin Service
 * Handles API calls to the admin endpoints
 */
class AdminService {
    constructor() {
        this.baseUrl = `${window.location.protocol}//${window.location.hostname}:8000`;
        this.token = localStorage.getItem('token');
    }

    /**
     * Get dashboard user statistics
     */
    async getUserStats() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/stats/users`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching user stats: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error in getUserStats:', error);
            throw error;
        }
    }

    /**
     * Get dashboard message statistics
     */
    async getMessageStats() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/stats/messages`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching message stats: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error in getMessageStats:', error);
            throw error;
        }
    }

    /**
     * Get dashboard group statistics
     */
    async getGroupStats() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/stats/groups`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching group stats: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error in getGroupStats:', error);
            throw error;
        }
    }

    /**
     * Get detailed user activity
     */
    async getUserActivity(userId) {
        try {
            const response = await fetch(`${this.baseUrl}/admin/users/${userId}/activity`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching user activity: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error in getUserActivity for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get detailed group activity
     */
    async getGroupActivity(groupId) {
        try {
            const response = await fetch(`${this.baseUrl}/admin/groups/${groupId}/activity`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching group activity: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`Error in getGroupActivity for group ${groupId}:`, error);
            throw error;
        }
    }

    /**
     * Get all users with pagination
     */
    async getUsers(page = 1, limit = 20, search = '') {
        try {
            const params = new URLSearchParams({
                page,
                limit,
                ...(search && { search })
            });

            const response = await fetch(`${this.baseUrl}/users/search?${params}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching users: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error in getUsers:', error);
            throw error;
        }
    }

    /**
     * Get all groups with pagination
     */
    async getGroups(page = 1, limit = 20, search = '') {
        try {
            // Temporary implementation - backend might not support pagination yet
            const response = await fetch(`${this.baseUrl}/groups`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching groups: ${response.statusText}`);
            }

            const groups = await response.json();
            
            // Client-side filtering based on search term
            let filtered = groups;
            if (search) {
                const searchLower = search.toLowerCase();
                filtered = groups.filter(group => 
                    group.group_name.toLowerCase().includes(searchLower)
                );
            }
            
            // Client-side pagination
            const start = (page - 1) * limit;
            const end = start + limit;
            const paginated = filtered.slice(start, end);
            
            return {
                groups: paginated,
                total: filtered.length
            };
        } catch (error) {
            console.error('Error in getGroups:', error);
            throw error;
        }
    }

    /**
     * Clean up expired tokens
     */
    async cleanupTokens() {
        try {
            const response = await fetch(`${this.baseUrl}/admin/cleanup-tokens`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Error cleaning up tokens: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error in cleanupTokens:', error);
            throw error;
        }
    }

    /**
     * Check admin privileges
     */
    async checkAdminAccess() {
        try {
            // Try to access an admin endpoint
            await this.getUserStats();
            return true;
        } catch (error) {
            console.error('Admin access check failed:', error);
            return false;
        }
    }
}

// Create a singleton instance
const adminService = new AdminService();