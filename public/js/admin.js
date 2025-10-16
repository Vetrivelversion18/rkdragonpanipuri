// Admin dashboard functionality
class AdminDashboard {
    constructor() {
        this.currentSection = 'dashboard';
        this.setupNavigation();
        this.loadDashboard();
    }

    // Setup navigation between sections
    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        const sections = document.querySelectorAll('.admin-section');

        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetSection = e.currentTarget.getAttribute('data-section');

                // Update active nav button
                navButtons.forEach(b => b.classList.remove('active'));
                e.currentTarget.classList.add('active');

                // Show target section
                sections.forEach(section => {
                    section.classList.remove('active');
                    if (section.id === targetSection) {
                        section.classList.add('active');
                    }
                });

                this.currentSection = targetSection;
                this.handleSectionChange(targetSection);
            });
        });
    }

    // Handle section changes
    handleSectionChange(section) {
        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'customers':
                if (customerManager) {
                    customerManager.loadAllCustomers();
                }
                break;
            case 'register':
                this.clearRegistrationForm();
                break;
            case 'stamping':
                this.clearStampingInterface();
                break;
            case 'export':
                this.loadExportSection();
                break;
        }
    }

    // Load dashboard data
    async loadDashboard() {
        try {
            // This is handled by authManager.loadAdminDashboard()
            if (authManager) {
                authManager.loadAdminDashboard();
            }
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    // Clear registration form
    clearRegistrationForm() {
        const form = document.getElementById('registerForm');
        if (form) {
            form.reset();
        }

        const resultContainer = document.getElementById('registrationResult');
        if (resultContainer) {
            resultContainer.classList.add('hidden');
        }
    }

    // Clear stamping interface
    clearStampingInterface() {
        const searchInput = document.getElementById('stampingSearch');
        if (searchInput) {
            searchInput.value = '';
        }

        const cardContainer = document.getElementById('customerStampingCard');
        if (cardContainer) {
            cardContainer.classList.add('hidden');
            cardContainer.innerHTML = '';
        }
    }

    // Load export section
    loadExportSection() {
        // Any specific loading for export section can be added here
        console.log('Export section loaded');
    }

    // Generate business report
    async generateBusinessReport() {
        try {
            const customersResult = await FirebaseUtils.getAllCustomers();
            if (!customersResult.success) {
                showNotification('Error loading customer data', 'error');
                return;
            }

            const customers = customersResult.customers;
            const report = this.analyzeBusinessData(customers);

            this.displayBusinessReport(report);

        } catch (error) {
            console.error('Error generating report:', error);
            showNotification('Error generating report', 'error');
        }
    }

    // Analyze business data
    analyzeBusinessData(customers) {
        const totalCustomers = customers.length;
        const completedCards = customers.filter(c => c.completed).length;
        const activeCards = totalCustomers - completedCards;

        let totalStamps = 0;
        let stampDistribution = [0, 0, 0, 0, 0, 0]; // Count for each stamp level (0-5 stamps)

        const now = new Date();
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        let newCustomersLast30Days = 0;
        let newCustomersLast7Days = 0;
        let recentActivity = 0;

        customers.forEach(customer => {
            const stampCount = customer.stamps.filter(s => s).length;
            totalStamps += stampCount;

            if (stampCount < 6) {
                stampDistribution[stampCount]++;
            }

            // Check registration dates
            const createdDate = customer.createdDate ? 
                (customer.createdDate.toDate ? customer.createdDate.toDate() : new Date(customer.createdDate)) : 
                null;

            if (createdDate) {
                if (createdDate > last30Days) newCustomersLast30Days++;
                if (createdDate > last7Days) newCustomersLast7Days++;
            }

            // Check recent activity
            const lastStampDate = customer.lastStampDate ? 
                (customer.lastStampDate.toDate ? customer.lastStampDate.toDate() : new Date(customer.lastStampDate)) : 
                null;

            if (lastStampDate && lastStampDate > last7Days) {
                recentActivity++;
            }
        });

        const completionRate = totalCustomers > 0 ? (completedCards / totalCustomers * 100).toFixed(1) : 0;
        const avgStampsPerCustomer = totalCustomers > 0 ? (totalStamps / totalCustomers).toFixed(1) : 0;

        return {
            totalCustomers,
            completedCards,
            activeCards,
            totalStamps,
            completionRate,
            avgStampsPerCustomer,
            stampDistribution,
            newCustomersLast30Days,
            newCustomersLast7Days,
            recentActivity,
            freeRewardsGiven: completedCards
        };
    }

    // Display business report
    displayBusinessReport(report) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <h2>Business Analytics Report</h2>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
                    <div class="stat-card">
                        <i class="fas fa-users"></i>
                        <div class="stat-info">
                            <h3>${report.totalCustomers}</h3>
                            <p>Total Customers</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <i class="fas fa-trophy"></i>
                        <div class="stat-info">
                            <h3>${report.completedCards}</h3>
                            <p>Completed Cards</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <i class="fas fa-percentage"></i>
                        <div class="stat-info">
                            <h3>${report.completionRate}%</h3>
                            <p>Completion Rate</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <i class="fas fa-gift"></i>
                        <div class="stat-info">
                            <h3>${report.freeRewardsGiven}</h3>
                            <p>Free Rewards Given</p>
                        </div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 2rem 0;">
                    <div>
                        <h3 style="color: #FFD700; margin-bottom: 1rem;">Customer Growth</h3>
                        <p><strong>New customers (30 days):</strong> ${report.newCustomersLast30Days}</p>
                        <p><strong>New customers (7 days):</strong> ${report.newCustomersLast7Days}</p>
                        <p><strong>Recent activity (7 days):</strong> ${report.recentActivity}</p>
                        <p><strong>Average stamps per customer:</strong> ${report.avgStampsPerCustomer}</p>
                    </div>

                    <div>
                        <h3 style="color: #FFD700; margin-bottom: 1rem;">Stamp Distribution</h3>
                        ${report.stampDistribution.map((count, stamps) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span>${stamps} stamps:</span>
                                <div style="display: flex; align-items: center; gap: 0.5rem;">
                                    <div style="width: 100px; height: 8px; background: rgba(255, 255, 255, 0.2); border-radius: 4px; overflow: hidden;">
                                        <div style="width: ${report.totalCustomers > 0 ? (count / report.totalCustomers * 100) : 0}%; height: 100%; background: #FFD700;"></div>
                                    </div>
                                    <span style="min-width: 30px;">${count}</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="text-align: center; margin-top: 2rem;">
                    <button onclick="adminDashboard.exportBusinessReport(${JSON.stringify(report).replace(/"/g, '&quot;')})" class="btn btn-primary">
                        <i class="fas fa-download"></i> Export Report
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Export business report
    exportBusinessReport(report) {
        const reportData = [
            ['RK DRAGON PANIPURI - Business Analytics Report'],
            ['Generated on:', new Date().toLocaleString()],
            [''],
            ['OVERVIEW'],
            ['Total Customers', report.totalCustomers],
            ['Completed Cards', report.completedCards],
            ['Active Cards', report.activeCards],
            ['Completion Rate', report.completionRate + '%'],
            ['Total Stamps Given', report.totalStamps],
            ['Average Stamps per Customer', report.avgStampsPerCustomer],
            ['Free Rewards Given', report.freeRewardsGiven],
            [''],
            ['CUSTOMER GROWTH'],
            ['New Customers (30 days)', report.newCustomersLast30Days],
            ['New Customers (7 days)', report.newCustomersLast7Days],
            ['Recent Activity (7 days)', report.recentActivity],
            [''],
            ['STAMP DISTRIBUTION'],
            ['0 stamps', report.stampDistribution[0]],
            ['1 stamp', report.stampDistribution[1]],
            ['2 stamps', report.stampDistribution[2]],
            ['3 stamps', report.stampDistribution[3]],
            ['4 stamps', report.stampDistribution[4]],
            ['5 stamps', report.stampDistribution[5]]
        ];

        const csvContent = reportData.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `rk-dragon-business-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Business report exported successfully', 'success');
    }

    // Add business insights
    showBusinessInsights() {
        FirebaseUtils.getAllCustomers().then(result => {
            if (result.success) {
                const insights = this.generateInsights(result.customers);
                this.displayInsights(insights);
            }
        }).catch(error => {
            console.error('Error loading insights:', error);
        });
    }

    // Generate business insights
    generateInsights(customers) {
        const insights = [];

        const totalCustomers = customers.length;
        const completedCards = customers.filter(c => c.completed).length;
        const completionRate = totalCustomers > 0 ? (completedCards / totalCustomers * 100) : 0;

        // Completion rate insights
        if (completionRate > 80) {
            insights.push({
                type: 'success',
                title: 'Excellent Completion Rate!',
                description: `${completionRate.toFixed(1)}% of customers complete their loyalty cards. This indicates high customer engagement.`,
                suggestion: 'Consider expanding the loyalty program or introducing premium rewards.'
            });
        } else if (completionRate < 30) {
            insights.push({
                type: 'warning',
                title: 'Low Completion Rate',
                description: `Only ${completionRate.toFixed(1)}% of customers complete their loyalty cards.`,
                suggestion: 'Consider offering intermediate rewards or reducing the number of required visits.'
            });
        }

        // Customer growth insights
        const now = new Date();
        const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const recentCustomers = customers.filter(c => {
            const createdDate = c.createdDate ? 
                (c.createdDate.toDate ? c.createdDate.toDate() : new Date(c.createdDate)) : 
                null;
            return createdDate && createdDate > last30Days;
        }).length;

        if (recentCustomers > totalCustomers * 0.2) {
            insights.push({
                type: 'success',
                title: 'Strong Customer Growth',
                description: `${recentCustomers} new customers joined in the last 30 days (${((recentCustomers / totalCustomers) * 100).toFixed(1)}% of total).`,
                suggestion: 'Maintain current marketing efforts and consider referral incentives.'
            });
        }

        // Activity insights
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentActivity = customers.filter(c => {
            const lastStampDate = c.lastStampDate ? 
                (c.lastStampDate.toDate ? c.lastStampDate.toDate() : new Date(c.lastStampDate)) : 
                null;
            return lastStampDate && lastStampDate > last7Days;
        }).length;

        if (recentActivity < totalCustomers * 0.1) {
            insights.push({
                type: 'info',
                title: 'Consider Customer Re-engagement',
                description: `Only ${recentActivity} customers were active in the last week.`,
                suggestion: 'Send reminders to inactive customers or offer special promotions.'
            });
        }

        return insights;
    }

    // Display insights
    displayInsights(insights) {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            max-width: 400px;
            z-index: 1000;
        `;

        insights.forEach((insight, index) => {
            const insightCard = document.createElement('div');
            insightCard.style.cssText = `
                background: linear-gradient(145deg, #1a1a1a, #2d1810);
                border: 2px solid ${insight.type === 'success' ? '#28a745' : insight.type === 'warning' ? '#ffc107' : '#17a2b8'};
                border-radius: 10px;
                padding: 1.5rem;
                margin-bottom: 1rem;
                color: white;
                animation: slideInRight 0.5s ease-out ${index * 0.2}s both;
            `;

            insightCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                    <h4 style="color: ${insight.type === 'success' ? '#28a745' : insight.type === 'warning' ? '#ffc107' : '#17a2b8'}; margin: 0;">
                        ${insight.title}
                    </h4>
                    <button onclick="this.closest('div').remove()" style="background: none; border: none; color: white; font-size: 1.2rem; cursor: pointer;">&times;</button>
                </div>
                <p style="margin-bottom: 1rem; font-size: 0.9rem; opacity: 0.9;">${insight.description}</p>
                <p style="margin: 0; font-size: 0.8rem; font-style: italic; opacity: 0.7;"><strong>Suggestion:</strong> ${insight.suggestion}</p>
            `;

            container.appendChild(insightCard);
        });

        // Add animation keyframes
        if (!document.getElementById('insightAnimations')) {
            const style = document.createElement('style');
            style.id = 'insightAnimations';
            style.textContent = `
                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(container);

        // Auto remove after 10 seconds
        setTimeout(() => {
            if (container.parentElement) {
                container.remove();
            }
        }, 10000);
    }
}

// Initialize admin dashboard
let adminDashboard;

document.addEventListener('DOMContentLoaded', function() {
    // Only initialize if on admin page
    if (document.querySelector('.admin-container')) {
        adminDashboard = new AdminDashboard();

        // Add business report button to dashboard
        const dashboardSection = document.getElementById('dashboard');
        if (dashboardSection) {
            const reportButton = document.createElement('button');
            reportButton.className = 'btn btn-secondary';
            reportButton.innerHTML = '<i class="fas fa-chart-line"></i> Generate Business Report';
            reportButton.style.marginTop = '2rem';
            reportButton.onclick = () => adminDashboard.generateBusinessReport();

            const insightsButton = document.createElement('button');
            insightsButton.className = 'btn btn-secondary';
            insightsButton.innerHTML = '<i class="fas fa-lightbulb"></i> Show Insights';
            insightsButton.style.marginTop = '1rem';
            insightsButton.style.marginLeft = '1rem';
            insightsButton.onclick = () => adminDashboard.showBusinessInsights();

            dashboardSection.appendChild(reportButton);
            dashboardSection.appendChild(insightsButton);
        }

        console.log('Admin dashboard initialized');
    }
});

console.log('Admin.js loaded successfully');