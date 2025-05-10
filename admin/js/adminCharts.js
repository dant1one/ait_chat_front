/**
 * Admin Charts Service
 * Handles chart creation and updates for the admin panel
 */
class AdminCharts {
    constructor() {
        this.charts = {};
        this.chartData = {};
        this.currentPeriod = 'day';
    }

    /**
     * Initialize message activity chart on the dashboard
     */
    initMessageActivityChart(messagesData) {
        // Store the data
        this.chartData.messagesPerDay = messagesData;
        
        // Clear any existing chart
        if (this.charts.messageActivity) {
            this.charts.messageActivity.destroy();
        }
        
        // Prepare data for chart
        const labels = messagesData.map(day => day.date);
        const directData = messagesData.map(day => day.direct_messages);
        const groupData = messagesData.map(day => day.group_messages);
        
        // Create chart
        const ctx = document.getElementById('messages-chart').getContext('2d');
        this.charts.messageActivity = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Direct Messages',
                        data: directData,
                        backgroundColor: 'rgba(54, 162, 235, 0.2)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: 'Group Messages',
                        data: groupData,
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    },
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }

    /**
     * Initialize message volume chart on the messages view
     */
    initMessageVolumeChart() {
        // Generate some example data
        const dates = [];
        const data = [];
        
        // Generate last 30 days
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.push(date.toISOString().split('T')[0]);
            
            // Random data for example
            data.push(Math.floor(Math.random() * 100));
        }
        
        // Clear any existing chart
        if (this.charts.messageVolume) {
            this.charts.messageVolume.destroy();
        }
        
        // Create chart
        const ctx = document.getElementById('message-volume-chart').getContext('2d');
        this.charts.messageVolume = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Message Volume',
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointRadius: 2,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
    }

    /**
     * Initialize message types chart on the messages view
     */
    initMessageTypesChart() {
        // Clear any existing chart
        if (this.charts.messageTypes) {
            this.charts.messageTypes.destroy();
        }
        
        // Create chart
        const ctx = document.getElementById('message-types-chart').getContext('2d');
        this.charts.messageTypes = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Direct Messages', 'Group Messages'],
                datasets: [{
                    data: [65, 35], // Example data
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 99, 132, 0.7)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    /**
     * Initialize media types chart on the messages view
     */
    initMediaTypesChart() {
        // Clear any existing chart
        if (this.charts.mediaTypes) {
            this.charts.mediaTypes.destroy();
        }
        
        // Create chart
        const ctx = document.getElementById('media-types-chart').getContext('2d');
        this.charts.mediaTypes = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Images', 'Videos', 'Audio', 'Documents', 'Other'],
                datasets: [{
                    data: [45, 20, 10, 15, 10], // Example data
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)',
                        'rgba(255, 206, 86, 1)',
                        'rgba(75, 192, 192, 1)',
                        'rgba(153, 102, 255, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
    }

    /**
     * Initialize busiest hours chart on the messages view
     */
    initBusiestHoursChart() {
        // Generate hours and example data
        const hours = Array.from({length: 24}, (_, i) => `${i}:00`);
        const data = Array.from({length: 24}, () => Math.floor(Math.random() * 100));
        
        // Clear any existing chart
        if (this.charts.busiestHours) {
            this.charts.busiestHours.destroy();
        }
        
        // Create chart
        const ctx = document.getElementById('busiest-hours-chart').getContext('2d');
        this.charts.busiestHours = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [{
                    label: 'Messages by Hour',
                    data: data,
                    backgroundColor: 'rgba(153, 102, 255, 0.5)',
                    borderColor: 'rgba(153, 102, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    },
                    x: {
                        ticks: {
                            maxRotation: 90,
                            minRotation: 45
                        }
                    }
                }
            }
        });
    }

    /**
     * Update charts based on selected period
     */
    updateChartPeriod(period) {
        this.currentPeriod = period;
        
        // Example of updating chart data based on period
        // In a real implementation, you would fetch new data from the server
        
        // Generate new random data based on the period
        const dates = [];
        const data = [];
        let days = 0;
        
        switch(period) {
            case 'day':
                days = 1;
                break;
            case 'week':
                days = 7;
                break;
            case 'month':
                days = 30;
                break;
            default:
                days = 7;
        }
        
        // Generate dates and data
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            dates.unshift(date.toISOString().split('T')[0]);
            
            // Random data for example
            data.unshift(Math.floor(Math.random() * 100));
        }
        
        // Update message volume chart
        if (this.charts.messageVolume) {
            this.charts.messageVolume.data.labels = dates;
            this.charts.messageVolume.data.datasets[0].data = data;
            this.charts.messageVolume.update();
        }
        
        // Update other charts as needed...
    }
}

// Create a singleton instance
const adminCharts = new AdminCharts();