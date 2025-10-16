// Customer management functionality
class CustomerManager {
    constructor() {
        this.currentCustomers = [];
        this.filteredCustomers = [];
        this.setupEventListeners();
    }

    // Setup event listeners
    setupEventListeners() {
        // Registration form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', this.handleRegistration.bind(this));
        }

        // Download card button
        const downloadBtn = document.getElementById('downloadCard');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', this.downloadGeneratedCard.bind(this));
        }

        // Stamping search
        const searchBtn = document.getElementById('searchCustomerBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', this.searchForStamping.bind(this));
        }

        // Customer filter
        const customerFilter = document.getElementById('customerFilter');
        if (customerFilter) {
            customerFilter.addEventListener('input', this.filterCustomers.bind(this));
        }

        // Refresh customers
        const refreshBtn = document.getElementById('refreshCustomers');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', this.loadAllCustomers.bind(this));
        }

        // CSV Export/Import
        const exportBtn = document.getElementById('exportCsvBtn');
        const importBtn = document.getElementById('importCsvBtn');
        const importFile = document.getElementById('importCsvFile');

        if (exportBtn) {
            exportBtn.addEventListener('click', this.exportCustomersCSV.bind(this));
        }

        if (importBtn) {
            importBtn.addEventListener('click', () => importFile.click());
        }

        if (importFile) {
            importFile.addEventListener('change', this.handleCSVImport.bind(this));
        }

        // Load customers on page load
        if (document.getElementById('customersTableBody')) {
            this.loadAllCustomers();
        }
    }

    // Handle customer registration
    async handleRegistration(e) {
        e.preventDefault();

        const name = document.getElementById('customerName').value.trim();
        const mobile = document.getElementById('customerMobile').value.trim();

        if (!name || !mobile) {
            showNotification('Please fill in all fields', 'error');
            return;
        }

        // Validate mobile number format
        const mobileRegex = /^\+91[0-9]{10}$/;
        if (!mobileRegex.test(mobile)) {
            showNotification('Please enter mobile number in format: +91XXXXXXXXXX', 'error');
            return;
        }

        try {
            const result = await FirebaseUtils.addCustomer({ name, mobile });

            if (result.success) {
                // Show success message
                showNotification(`Customer registered successfully! ID: ${result.customerId}`, 'success');

                // Clear form
                document.getElementById('registerForm').reset();

                // Show generated card
                this.displayGeneratedCard(result.customerData);

                // Update dashboard stats if on dashboard
                if (authManager) {
                    authManager.loadAdminDashboard();
                }

            } else {
                showNotification(result.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showNotification('Registration failed. Please try again.', 'error');
        }
    }

    // Display generated ID card
    displayGeneratedCard(customer) {
        const resultContainer = document.getElementById('registrationResult');
        const cardContainer = document.getElementById('generatedCard');

        if (!resultContainer || !cardContainer) return;

        const cardHtml = this.generateCardHTML(customer);
        cardContainer.innerHTML = cardHtml;

        resultContainer.classList.remove('hidden');

        // Store customer data for download
        this.lastGeneratedCustomer = customer;

        // Scroll to result
        resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Generate card HTML
    generateCardHTML(customer) {
        const completedStamps = customer.stamps ? customer.stamps.filter(stamp => stamp).length : 0;

        return `
            <div style="background: linear-gradient(145deg, #8B0000, #DC143C); border: 3px solid #FFD700; border-radius: 15px; padding: 2rem; color: white; text-align: center; position: relative; max-width: 400px; margin: 0 auto;">
                <div style="border: 1px solid rgba(255, 215, 0, 0.5); border-radius: 10px; position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; pointer-events: none;"></div>

                <div style="margin-bottom: 1.5rem;">
                    <img src="images/dragon-logo.svg" alt="Dragon Logo" style="width: 60px; height: 60px; margin-bottom: 1rem; filter: drop-shadow(0 5px 15px rgba(255, 215, 0, 0.5));">
                    <div style="font-size: 1.8rem; font-weight: 700; color: #FFD700; margin-bottom: 0.5rem; text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);">
                        RK DRAGON PANIPURI
                    </div>
                    <div style="font-size: 1rem; opacity: 0.9;">
                        6-Day Loyalty Card
                    </div>
                </div>

                <div style="margin: 1.5rem 0;">
                    <div style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem;">
                        ${customer.name}
                    </div>
                    <div style="font-size: 1.2rem; color: #FFD700; font-weight: 500; margin-bottom: 0.5rem;">
                        ${customer.customerId}
                    </div>
                    <div style="font-size: 1rem; opacity: 0.9;">
                        ${customer.mobile}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; margin: 1.5rem 0; padding: 1rem; background: rgba(0, 0, 0, 0.2); border-radius: 10px;">
                    ${Array.from({ length: 6 }, (_, index) => {
                        const isStamped = customer.stamps && customer.stamps[index];
                        return `
                            <div style="width: 40px; height: 40px; border: 2px ${isStamped ? 'solid' : 'dashed'} ${isStamped ? '#FFD700' : 'rgba(255, 215, 0, 0.5)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${isStamped ? '#FFD700' : 'transparent'}; color: ${isStamped ? '#8B0000' : 'transparent'}; font-size: 1.2rem; margin: 0 auto;">
                                ${isStamped ? '🐉' : ''}
                            </div>
                        `;
                    }).join('')}
                </div>

                <div style="margin-top: 1.5rem;">
                    <div style="background: rgba(255, 255, 255, 0.2); border-radius: 10px; height: 8px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #FFD700, #FFA500); height: 100%; width: ${(completedStamps / 6) * 100}%; border-radius: 10px;"></div>
                    </div>
                    <div style="margin-top: 1rem; font-size: 1rem;">
                        ${completedStamps}/6 stamps collected
                    </div>
                    <div style="margin-top: 0.5rem; font-size: 0.9rem; opacity: 0.8;">
                        Visit us daily to collect stamps!
                    </div>
                </div>

                <div style="margin-top: 1.5rem; font-size: 0.75rem; opacity: 0.7; border-top: 1px solid rgba(255, 215, 0, 0.3); padding-top: 1rem;">
                    Generated on: ${new Date().toLocaleDateString()}
                </div>
            </div>
        `;
    }

    // Download generated card
    downloadGeneratedCard() {
        if (this.lastGeneratedCustomer) {
            this.downloadCustomerCard(this.lastGeneratedCustomer);
        } else {
            showNotification('No card data available', 'error');
        }
    }

    // Download customer card as JPG
    downloadCustomerCard(customer) {
        // Create temporary container for card generation
        const cardContainer = document.createElement('div');
        cardContainer.style.position = 'absolute';
        cardContainer.style.left = '-9999px';
        cardContainer.style.width = '400px';
        cardContainer.style.height = '600px';
        cardContainer.style.fontFamily = 'Poppins, sans-serif';
        cardContainer.innerHTML = this.generateCardHTML(customer);

        document.body.appendChild(cardContainer);

        // Use html2canvas to generate image
        html2canvas(cardContainer, {
            backgroundColor: null,
            scale: 2,
            logging: false,
            useCORS: true
        }).then(canvas => {
            canvas.toBlob(function(blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${customer.customerId}-loyalty-card.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                showNotification('Card downloaded successfully!', 'success');
            }, 'image/jpeg', 0.9);

            document.body.removeChild(cardContainer);
        }).catch(error => {
            console.error('Error generating card:', error);
            showNotification('Error generating card image', 'error');
            document.body.removeChild(cardContainer);
        });
    }

    // Search customer for stamping
    async searchForStamping() {
        const searchTerm = document.getElementById('stampingSearch').value.trim();
        const cardContainer = document.getElementById('customerStampingCard');

        if (!searchTerm) {
            showNotification('Please enter Customer ID or Mobile Number', 'error');
            return;
        }

        try {
            const result = await FirebaseUtils.getCustomer(searchTerm);

            if (result.success) {
                this.displayStampingInterface(result.customer);
                cardContainer.classList.remove('hidden');
            } else {
                showNotification('Customer not found', 'error');
                cardContainer.classList.add('hidden');
            }
        } catch (error) {
            console.error('Search error:', error);
            showNotification('Error searching customer', 'error');
        }
    }

    // Display stamping interface
    displayStampingInterface(customer) {
        const container = document.getElementById('customerStampingCard');

        const stampingHtml = `
            <div class="customer-info">
                <div class="customer-name">${customer.name}</div>
                <div class="customer-id">${customer.customerId}</div>
                <div style="opacity: 0.8; margin-bottom: 1rem;">${customer.mobile}</div>
                ${customer.completed ? 
                    '<div style="background: linear-gradient(145deg, #FFD700, #FFA500); color: #8B0000; padding: 1rem; border-radius: 10px; font-weight: bold; margin-bottom: 1rem;">🎉 COMPLETED - FREE PANIPURI EARNED! 🎉</div>' : 
                    ''
                }
            </div>

            <div class="stamps-grid">
                ${customer.stamps.map((stamped, index) => `
                    <div class="stamp-day ${stamped ? 'stamped' : ''}" onclick="customerManager.toggleStamp('${customer.customerId}', ${index})">
                        <div class="day-number">Day ${index + 1}</div>
                        ${stamped ? '<div class="dragon-stamp">🐉</div>' : '<div style="opacity: 0.5;">Click to stamp</div>'}
                    </div>
                `).join('')}
            </div>

            <div style="margin-top: 2rem; text-align: center;">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(customer.stamps.filter(s => s).length / 6) * 100}%"></div>
                </div>
                <p style="margin-top: 1rem;">${customer.stamps.filter(s => s).length}/6 stamps collected</p>

                <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button onclick="customerManager.downloadCustomerCard(customerManager.currentStampingCustomer)" class="btn btn-secondary">
                        <i class="fas fa-download"></i> Download Card
                    </button>
                    <button onclick="customerManager.resetCustomerStamps('${customer.customerId}')" class="btn btn-logout">
                        <i class="fas fa-undo"></i> Reset Stamps
                    </button>
                </div>
            </div>
        `;

        container.innerHTML = stampingHtml;
        this.currentStampingCustomer = customer;
    }

    // Toggle stamp for a specific day
    async toggleStamp(customerId, dayIndex) {
        if (!this.currentStampingCustomer || this.currentStampingCustomer.customerId !== customerId) {
            showNotification('Customer data not found', 'error');
            return;
        }

        const stamps = [...this.currentStampingCustomer.stamps];
        stamps[dayIndex] = !stamps[dayIndex];

        try {
            const result = await FirebaseUtils.updateCustomerStamps(customerId, stamps);

            if (result.success) {
                this.currentStampingCustomer.stamps = stamps;
                this.displayStampingInterface(this.currentStampingCustomer);

                // Check if completed
                if (result.completed) {
                    this.showCompletionCelebration();
                }

                showNotification(`Stamp ${stamps[dayIndex] ? 'added' : 'removed'} successfully`, 'success');

                // Update dashboard if available
                if (authManager) {
                    authManager.loadAdminDashboard();
                }

            } else {
                showNotification('Error updating stamp', 'error');
            }
        } catch (error) {
            console.error('Stamp update error:', error);
            showNotification('Error updating stamp', 'error');
        }
    }

    // Reset customer stamps
    async resetCustomerStamps(customerId) {
        if (!confirm('Are you sure you want to reset all stamps for this customer?')) {
            return;
        }

        const emptyStamps = [false, false, false, false, false, false];

        try {
            const result = await FirebaseUtils.updateCustomerStamps(customerId, emptyStamps);

            if (result.success) {
                this.currentStampingCustomer.stamps = emptyStamps;
                this.currentStampingCustomer.completed = false;
                this.displayStampingInterface(this.currentStampingCustomer);

                showNotification('Stamps reset successfully', 'success');

                // Update dashboard if available
                if (authManager) {
                    authManager.loadAdminDashboard();
                }
            } else {
                showNotification('Error resetting stamps', 'error');
            }
        } catch (error) {
            console.error('Reset error:', error);
            showNotification('Error resetting stamps', 'error');
        }
    }

    // Show completion celebration modal
    showCompletionCelebration() {
        const modal = document.getElementById('completionModal');
        if (modal) {
            modal.style.display = 'block';

            // Auto close after 5 seconds
            setTimeout(() => {
                modal.style.display = 'none';
            }, 5000);
        }
    }

    // Load all customers for management
    async loadAllCustomers() {
        try {
            const result = await FirebaseUtils.getAllCustomers();

            if (result.success) {
                this.currentCustomers = result.customers;
                this.filteredCustomers = [...this.currentCustomers];
                this.displayCustomersTable();
            } else {
                showNotification('Error loading customers', 'error');
            }
        } catch (error) {
            console.error('Load customers error:', error);
            showNotification('Error loading customers', 'error');
        }
    }

    // Display customers in table
    displayCustomersTable() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;

        if (this.filteredCustomers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; opacity: 0.7;">No customers found</td></tr>';
            return;
        }

        const rows = this.filteredCustomers.map(customer => {
            const stampCount = customer.stamps.filter(s => s).length;
            const statusClass = customer.completed ? 'status-completed' : 'status-active';
            const statusText = customer.completed ? 'Completed' : `${stampCount}/6 stamps`;

            return `
                <tr>
                    <td>${customer.customerId}</td>
                    <td>${customer.name}</td>
                    <td>${customer.mobile}</td>
                    <td>
                        <div style="display: flex; gap: 2px;">
                            ${customer.stamps.map(stamped => `
                                <div style="width: 20px; height: 20px; border-radius: 50%; background: ${stamped ? '#FFD700' : 'rgba(255, 255, 255, 0.2)'}; display: flex; align-items: center; justify-content: center; font-size: 0.8rem;">
                                    ${stamped ? '🐉' : ''}
                                </div>
                            `).join('')}
                        </div>
                    </td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button onclick="customerManager.viewCustomer('${customer.customerId}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.8rem; margin-right: 0.5rem;">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="customerManager.deleteCustomer('${customer.customerId}')" class="btn btn-logout" style="padding: 0.5rem 1rem; font-size: 0.8rem;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.innerHTML = rows;
    }

    // Filter customers
    filterCustomers(e) {
        const query = e.target.value.toLowerCase();

        this.filteredCustomers = this.currentCustomers.filter(customer => 
            customer.name.toLowerCase().includes(query) ||
            customer.customerId.toLowerCase().includes(query) ||
            customer.mobile.includes(query)
        );

        this.displayCustomersTable();
    }

    // View customer details
    async viewCustomer(customerId) {
        try {
            const result = await FirebaseUtils.getCustomer(customerId);

            if (result.success) {
                this.showCustomerDetails(result.customer);
            } else {
                showNotification('Customer not found', 'error');
            }
        } catch (error) {
            console.error('View customer error:', error);
            showNotification('Error loading customer details', 'error');
        }
    }

    // Show customer details modal
    showCustomerDetails(customer) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.display = 'block';

        const completedStamps = customer.stamps.filter(s => s).length;

        modal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                <h2>Customer Details</h2>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin: 2rem 0;">
                    <div>
                        <h3 style="color: #FFD700; margin-bottom: 1rem;">Information</h3>
                        <p><strong>Name:</strong> ${customer.name}</p>
                        <p><strong>ID:</strong> ${customer.customerId}</p>
                        <p><strong>Mobile:</strong> ${customer.mobile}</p>
                        <p><strong>Status:</strong> ${customer.completed ? 'Completed' : 'Active'}</p>
                        <p><strong>Stamps:</strong> ${completedStamps}/6</p>
                    </div>

                    <div>
                        <h3 style="color: #FFD700; margin-bottom: 1rem;">Stamp Progress</h3>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem;">
                            ${customer.stamps.map((stamped, index) => `
                                <div style="width: 50px; height: 50px; border: 2px ${stamped ? 'solid' : 'dashed'} ${stamped ? '#FFD700' : 'rgba(255, 215, 0, 0.5)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: ${stamped ? '#FFD700' : 'transparent'}; color: ${stamped ? '#8B0000' : '#FFD700'};">
                                    ${stamped ? '🐉' : index + 1}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <div style="text-align: center; margin-top: 2rem;">
                    <button onclick="customerManager.downloadCustomerCard(${JSON.stringify(customer).replace(/"/g, '&quot;')})" class="btn btn-primary">
                        <i class="fas fa-download"></i> Download Card
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    // Delete customer
    async deleteCustomer(customerId) {
        if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
            return;
        }

        try {
            const result = await FirebaseUtils.deleteCustomer(customerId);

            if (result.success) {
                showNotification('Customer deleted successfully', 'success');
                this.loadAllCustomers(); // Reload table

                // Update dashboard if available
                if (authManager) {
                    authManager.loadAdminDashboard();
                }
            } else {
                showNotification('Error deleting customer', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showNotification('Error deleting customer', 'error');
        }
    }

    // Export customers to CSV
    exportCustomersCSV() {
        if (this.currentCustomers.length === 0) {
            showNotification('No customers to export', 'error');
            return;
        }

        const headers = ['Customer ID', 'Name', 'Mobile', 'Stamps', 'Completed', 'Total Visits', 'Created Date'];
        const csvData = [headers];

        this.currentCustomers.forEach(customer => {
            const stampsString = customer.stamps.map(s => s ? '1' : '0').join('');
            const createdDate = customer.createdDate ? 
                (customer.createdDate.toDate ? customer.createdDate.toDate().toLocaleDateString() : new Date(customer.createdDate).toLocaleDateString()) : 
                'N/A';

            csvData.push([
                customer.customerId,
                customer.name,
                customer.mobile,
                stampsString,
                customer.completed ? 'Yes' : 'No',
                customer.totalVisits || 0,
                createdDate
            ]);
        });

        const csvContent = csvData.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `rk-dragon-customers-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showNotification('Customer data exported successfully', 'success');
    }

    // Handle CSV import
    handleCSVImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const csv = event.target.result;
                const lines = csv.split('\n');
                const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());

                const customers = [];

                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const values = line.split(',').map(v => v.replace(/"/g, '').trim());

                    if (values.length >= 4) {
                        const stamps = values[3].split('').map(s => s === '1');

                        customers.push({
                            customerId: values[0],
                            name: values[1],
                            mobile: values[2],
                            stamps: stamps.length === 6 ? stamps : [false, false, false, false, false, false],
                            completed: values[4] === 'Yes',
                            totalVisits: parseInt(values[5]) || 0
                        });
                    }
                }

                if (customers.length > 0) {
                    const result = await FirebaseUtils.importCustomers(customers);

                    if (result.success) {
                        showNotification(`Successfully imported ${result.results.success} customers`, 'success');
                        if (result.results.errors.length > 0) {
                            console.warn('Import errors:', result.results.errors);
                        }
                        this.loadAllCustomers(); // Reload table

                        // Update dashboard if available
                        if (authManager) {
                            authManager.loadAdminDashboard();
                        }
                    } else {
                        showNotification('Error importing customers', 'error');
                    }
                } else {
                    showNotification('No valid customer data found in CSV', 'error');
                }

            } catch (error) {
                console.error('CSV import error:', error);
                showNotification('Error reading CSV file', 'error');
            }
        };

        reader.readAsText(file);

        // Clear file input
        e.target.value = '';
    }
}

// Global close completion modal function
window.closeCompletionModal = function() {
    const modal = document.getElementById('completionModal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// Initialize customer manager
let customerManager;

document.addEventListener('DOMContentLoaded', function() {
    customerManager = new CustomerManager();
    console.log('Customer management system initialized');
});

console.log('Customer.js loaded successfully');