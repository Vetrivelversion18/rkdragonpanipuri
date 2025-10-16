// Authentication functionality
class AuthManager {
    constructor() {
        this.checkAuthOnLoad();
    }

    // Check authentication on page load
    checkAuthOnLoad() {
        const isLoggedIn = sessionStorage.getItem('adminLoggedIn');
        const currentPage = window.location.pathname.split('/').pop();

        // If on admin page and not logged in, redirect to home
        if (currentPage === 'admin.html' && !isLoggedIn) {
            window.location.href = 'index.html';
            return;
        }

        // If logged in and on main page, can access admin
        if (isLoggedIn && currentPage === 'index.html') {
            this.addQuickAdminAccess();
        }

        // Set up logout functionality if on admin page
        if (currentPage === 'admin.html' && isLoggedIn) {
            this.setupLogout();
            this.loadAdminDashboard();
        }
    }

    // Add quick admin access button on main page for logged in users
    addQuickAdminAccess() {
        const existingQuickAccess = document.getElementById('quickAdminAccess');
        if (existingQuickAccess) return;

        const quickAccessBtn = document.createElement('button');
        quickAccessBtn.id = 'quickAdminAccess';
        quickAccessBtn.className = 'btn btn-success';
        quickAccessBtn.innerHTML = '<i class="fas fa-tachometer-alt"></i> Go to Dashboard';
        quickAccessBtn.style.position = 'fixed';
        quickAccessBtn.style.top = '20px';
        quickAccessBtn.style.right = '20px';
        quickAccessBtn.style.zIndex = '1000';

        quickAccessBtn.addEventListener('click', () => {
            window.location.href = 'admin.html';
        });

        document.body.appendChild(quickAccessBtn);
    }

    // Setup logout functionality
    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.logout.bind(this));
        }
    }

    // Logout function
    logout() {
        // Clear session storage
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminUsername');

        // Clear any cached data
        currentUser = null;
        currentCustomer = null;

        // Show logout message
        this.showLogoutMessage();

        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    }

    // Show logout message
    showLogoutMessage() {
        const logoutOverlay = document.createElement('div');
        logoutOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            backdrop-filter: blur(5px);
        `;

        logoutOverlay.innerHTML = `
            <div style="
                background: linear-gradient(145deg, #8B0000, #DC143C);
                color: white;
                padding: 3rem;
                border-radius: 20px;
                text-align: center;
                border: 2px solid #FFD700;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            ">
                <i class="fas fa-sign-out-alt" style="font-size: 3rem; color: #FFD700; margin-bottom: 1rem;"></i>
                <h2 style="color: #FFD700; margin-bottom: 1rem;">Logged Out Successfully</h2>
                <p>Thank you for using RK Dragon Panipuri Loyalty System</p>
                <div style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.8;">
                    Redirecting to home page...
                </div>
            </div>
        `;

        document.body.appendChild(logoutOverlay);
    }

    // Load admin dashboard data
    async loadAdminDashboard() {
        try {
            // Load dashboard statistics
            const statsResult = await FirebaseUtils.getDashboardStats();
            if (statsResult.success) {
                this.updateDashboardStats(statsResult.stats);
            }

            // Load recent activity
            this.loadRecentActivity();

        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    // Update dashboard statistics
    updateDashboardStats(stats) {
        const elements = {
            totalCustomers: document.getElementById('totalCustomers'),
            completedCards: document.getElementById('completedCards'),
            totalStamps: document.getElementById('totalStamps'),
            freeRewards: document.getElementById('freeRewards')
        };

        // Animate counters
        Object.keys(elements).forEach(key => {
            if (elements[key]) {
                this.animateCounter(elements[key], stats[key] || 0);
            }
        });
    }

    // Animate counter numbers
    animateCounter(element, targetValue) {
        const startValue = 0;
        const duration = 2000; // 2 seconds
        const increment = targetValue / (duration / 16); // 60fps
        let currentValue = startValue;

        const updateCounter = () => {
            currentValue += increment;
            if (currentValue >= targetValue) {
                element.textContent = targetValue;
            } else {
                element.textContent = Math.floor(currentValue);
                requestAnimationFrame(updateCounter);
            }
        };

        updateCounter();
    }

    // Load recent activity
    async loadRecentActivity() {
        try {
            const customersResult = await FirebaseUtils.getAllCustomers();
            if (customersResult.success) {
                const recentActivities = this.generateRecentActivities(customersResult.customers);
                this.displayRecentActivities(recentActivities);
            }
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    // Generate recent activities from customer data
    generateRecentActivities(customers) {
        const activities = [];
        const now = new Date();

        // Sort customers by last activity
        const sortedCustomers = customers
            .filter(customer => customer.lastStampDate)
            .sort((a, b) => {
                const dateA = a.lastStampDate.toDate ? a.lastStampDate.toDate() : new Date(a.lastStampDate);
                const dateB = b.lastStampDate.toDate ? b.lastStampDate.toDate() : new Date(b.lastStampDate);
                return dateB - dateA;
            })
            .slice(0, 5); // Get last 5 activities

        sortedCustomers.forEach(customer => {
            const stampCount = customer.stamps.filter(stamp => stamp).length;
            const activityDate = customer.lastStampDate.toDate ? customer.lastStampDate.toDate() : new Date(customer.lastStampDate);
            const timeAgo = this.getTimeAgo(activityDate);

            if (customer.completed) {
                activities.push({
                    type: 'completion',
                    text: `${customer.name} completed their loyalty card!`,
                    time: timeAgo,
                    icon: 'fas fa-trophy'
                });
            } else {
                activities.push({
                    type: 'stamp',
                    text: `${customer.name} received stamp #${stampCount}`,
                    time: timeAgo,
                    icon: 'fas fa-stamp'
                });
            }
        });

        // Add some recent registrations
        const recentRegistrations = customers
            .sort((a, b) => {
                const dateA = a.createdDate.toDate ? a.createdDate.toDate() : new Date(a.createdDate);
                const dateB = b.createdDate.toDate ? b.createdDate.toDate() : new Date(b.createdDate);
                return dateB - dateA;
            })
            .slice(0, 3);

        recentRegistrations.forEach(customer => {
            const registrationDate = customer.createdDate.toDate ? customer.createdDate.toDate() : new Date(customer.createdDate);
            const timeAgo = this.getTimeAgo(registrationDate);

            activities.push({
                type: 'registration',
                text: `New customer ${customer.name} registered`,
                time: timeAgo,
                icon: 'fas fa-user-plus'
            });
        });

        return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 8);
    }

    // Display recent activities
    displayRecentActivities(activities) {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = '<div class="activity-item"><div class="activity-text">No recent activity</div></div>';
            return;
        }

        const activitiesHtml = activities.map(activity => `
            <div class="activity-item">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <i class="${activity.icon}" style="color: #FFD700; font-size: 1.2rem;"></i>
                    <div style="flex: 1;">
                        <div class="activity-text">${activity.text}</div>
                        <div class="activity-time">${activity.time}</div>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = activitiesHtml;
    }

    // Get time ago string
    getTimeAgo(date) {
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffTime / (1000 * 60));

        if (diffDays > 0) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffMinutes > 0) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        } else {
            return 'Just now';
        }
    }

    // Get current admin user
    getCurrentUser() {
        return {
            username: sessionStorage.getItem('adminUsername'),
            isLoggedIn: !!sessionStorage.getItem('adminLoggedIn')
        };
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!sessionStorage.getItem('adminLoggedIn');
    }
}

// Session timeout functionality
class SessionManager {
    constructor() {
        this.timeoutDuration = 30 * 60 * 1000; // 30 minutes
        this.warningDuration = 5 * 60 * 1000; // 5 minutes warning
        this.setupSessionTimeout();
    }

    setupSessionTimeout() {
        if (!sessionStorage.getItem('adminLoggedIn')) return;

        // Reset timeout on user activity
        const resetTimeout = () => {
            this.clearTimeouts();
            this.startTimeout();
        };

        // Listen for user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        events.forEach(event => {
            document.addEventListener(event, resetTimeout, true);
        });

        this.startTimeout();
    }

    startTimeout() {
        // Warning timeout
        this.warningTimeout = setTimeout(() => {
            this.showSessionWarning();
        }, this.timeoutDuration - this.warningDuration);

        // Logout timeout
        this.logoutTimeout = setTimeout(() => {
            this.forceLogout();
        }, this.timeoutDuration);
    }

    clearTimeouts() {
        if (this.warningTimeout) clearTimeout(this.warningTimeout);
        if (this.logoutTimeout) clearTimeout(this.logoutTimeout);
    }

    showSessionWarning() {
        const warning = document.createElement('div');
        warning.id = 'sessionWarning';
        warning.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(145deg, #8B4513, #A0522D);
            color: white;
            padding: 2rem;
            border-radius: 15px;
            border: 2px solid #FFD700;
            z-index: 10000;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;

        warning.innerHTML = `
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #FFD700; margin-bottom: 1rem;"></i>
            <h3 style="color: #FFD700; margin-bottom: 1rem;">Session Expiring</h3>
            <p>Your session will expire in 5 minutes due to inactivity.</p>
            <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center;">
                <button onclick="sessionManager.extendSession()" class="btn btn-primary">
                    Stay Logged In
                </button>
                <button onclick="authManager.logout()" class="btn btn-secondary">
                    Logout Now
                </button>
            </div>
        `;

        document.body.appendChild(warning);
    }

    extendSession() {
        const warning = document.getElementById('sessionWarning');
        if (warning) warning.remove();

        this.clearTimeouts();
        this.startTimeout();

        showNotification('Session extended successfully', 'success');
    }

    forceLogout() {
        const warning = document.getElementById('sessionWarning');
        if (warning) warning.remove();

        showNotification('Session expired due to inactivity', 'error');

        setTimeout(() => {
            if (authManager) {
                authManager.logout();
            } else {
                window.location.href = 'index.html';
            }
        }, 2000);
    }
}

// Initialize authentication manager
let authManager;
let sessionManager;

document.addEventListener('DOMContentLoaded', function() {
    authManager = new AuthManager();
    sessionManager = new SessionManager();

    console.log('Authentication system initialized');
});

// Global function for session management
window.sessionManager = {
    extendSession: function() {
        sessionManager.extendSession();
    }
};

console.log('Auth.js loaded successfully');