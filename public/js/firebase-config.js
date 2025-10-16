// Firebase Configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "your-api-key-here",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore
const db = firebase.firestore();

// Initialize Auth
const auth = firebase.auth();

// Encryption utility functions for data security
class DataEncryption {
    static encrypt(text) {
        // Simple base64 encoding for demo (use proper encryption in production)
        return btoa(text);
    }

    static decrypt(encryptedText) {
        // Simple base64 decoding for demo (use proper decryption in production)
        try {
            return atob(encryptedText);
        } catch (e) {
            return encryptedText; // Return as-is if not encrypted
        }
    }
}

// Firebase utility functions
class FirebaseUtils {

    // Generate unique customer ID
    static generateCustomerId() {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `RK${randomNum}`;
    }

    // Add customer to database
    static async addCustomer(customerData) {
        try {
            const customerId = this.generateCustomerId();

            // Check if customer ID already exists
            const existingCustomer = await db.collection('customers').doc(customerId).get();
            if (existingCustomer.exists) {
                return this.addCustomer(customerData); // Try again with new ID
            }

            // Check if mobile number already exists
            const mobileQuery = await db.collection('customers')
                .where('mobile', '==', DataEncryption.encrypt(customerData.mobile))
                .get();

            if (!mobileQuery.empty) {
                throw new Error('Customer with this mobile number already exists');
            }

            const encryptedCustomerData = {
                customerId: customerId,
                name: DataEncryption.encrypt(customerData.name),
                mobile: DataEncryption.encrypt(customerData.mobile),
                createdDate: firebase.firestore.FieldValue.serverTimestamp(),
                stamps: [false, false, false, false, false, false],
                completed: false,
                totalVisits: 0,
                lastStampDate: null
            };

            await db.collection('customers').doc(customerId).set(encryptedCustomerData);

            return {
                success: true,
                customerId: customerId,
                customerData: {
                    ...customerData,
                    customerId: customerId,
                    stamps: [false, false, false, false, false, false],
                    completed: false
                }
            };
        } catch (error) {
            console.error('Error adding customer:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get customer by ID or mobile
    static async getCustomer(searchTerm) {
        try {
            let customerDoc;

            // Try to get by customer ID first
            if (searchTerm.startsWith('RK')) {
                customerDoc = await db.collection('customers').doc(searchTerm).get();
            } else {
                // Search by mobile number
                const mobileQuery = await db.collection('customers')
                    .where('mobile', '==', DataEncryption.encrypt(searchTerm))
                    .get();

                if (!mobileQuery.empty) {
                    customerDoc = mobileQuery.docs[0];
                }
            }

            if (customerDoc && customerDoc.exists) {
                const data = customerDoc.data();
                return {
                    success: true,
                    customer: {
                        customerId: data.customerId,
                        name: DataEncryption.decrypt(data.name),
                        mobile: DataEncryption.decrypt(data.mobile),
                        stamps: data.stamps,
                        completed: data.completed,
                        totalVisits: data.totalVisits || 0,
                        createdDate: data.createdDate,
                        lastStampDate: data.lastStampDate
                    }
                };
            } else {
                return {
                    success: false,
                    error: 'Customer not found'
                };
            }
        } catch (error) {
            console.error('Error getting customer:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Update customer stamps
    static async updateCustomerStamps(customerId, stamps) {
        try {
            const completedStamps = stamps.filter(stamp => stamp).length;
            const isCompleted = completedStamps === 6;

            await db.collection('customers').doc(customerId).update({
                stamps: stamps,
                completed: isCompleted,
                totalVisits: completedStamps,
                lastStampDate: firebase.firestore.FieldValue.serverTimestamp()
            });

            return {
                success: true,
                completed: isCompleted
            };
        } catch (error) {
            console.error('Error updating stamps:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get all customers
    static async getAllCustomers() {
        try {
            const snapshot = await db.collection('customers').orderBy('createdDate', 'desc').get();
            const customers = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                customers.push({
                    customerId: data.customerId,
                    name: DataEncryption.decrypt(data.name),
                    mobile: DataEncryption.decrypt(data.mobile),
                    stamps: data.stamps,
                    completed: data.completed,
                    totalVisits: data.totalVisits || 0,
                    createdDate: data.createdDate,
                    lastStampDate: data.lastStampDate
                });
            });

            return {
                success: true,
                customers: customers
            };
        } catch (error) {
            console.error('Error getting customers:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Delete customer
    static async deleteCustomer(customerId) {
        try {
            await db.collection('customers').doc(customerId).delete();
            return {
                success: true
            };
        } catch (error) {
            console.error('Error deleting customer:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Get dashboard statistics
    static async getDashboardStats() {
        try {
            const snapshot = await db.collection('customers').get();
            let totalCustomers = 0;
            let completedCards = 0;
            let totalStamps = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                totalCustomers++;
                if (data.completed) completedCards++;
                if (data.stamps) {
                    totalStamps += data.stamps.filter(stamp => stamp).length;
                }
            });

            return {
                success: true,
                stats: {
                    totalCustomers,
                    completedCards,
                    totalStamps,
                    freeRewards: completedCards
                }
            };
        } catch (error) {
            console.error('Error getting stats:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Import customers from CSV data
    static async importCustomers(customersData) {
        try {
            const batch = db.batch();
            const results = {
                success: 0,
                errors: []
            };

            for (const customer of customersData) {
                try {
                    const customerId = customer.customerId || this.generateCustomerId();
                    const customerRef = db.collection('customers').doc(customerId);

                    const encryptedData = {
                        customerId: customerId,
                        name: DataEncryption.encrypt(customer.name),
                        mobile: DataEncryption.encrypt(customer.mobile),
                        createdDate: firebase.firestore.FieldValue.serverTimestamp(),
                        stamps: customer.stamps || [false, false, false, false, false, false],
                        completed: customer.completed || false,
                        totalVisits: customer.totalVisits || 0,
                        lastStampDate: customer.lastStampDate || null
                    };

                    batch.set(customerRef, encryptedData, { merge: true });
                    results.success++;
                } catch (error) {
                    results.errors.push(`Error importing ${customer.name}: ${error.message}`);
                }
            }

            await batch.commit();

            return {
                success: true,
                results: results
            };
        } catch (error) {
            console.error('Error importing customers:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// Admin authentication
const ADMIN_CREDENTIALS = {
    username: 'Rajvignesh',
    password: 'RK1234@'
};

// Global variables
let currentUser = null;
let currentCustomer = null;

console.log('Firebase configuration loaded successfully');