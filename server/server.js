const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin SDK
const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
// Note: In production, use service account key file or environment variables
const serviceAccount = {
    "type": "service_account",
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_CERT_URL
};

// Initialize Firebase Admin only if not already initialized
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
        });
        console.log('Firebase Admin initialized successfully');
    } catch (error) {
        console.warn('Firebase Admin initialization failed:', error.message);
        console.log('Continuing without Firebase Admin SDK...');
    }
}

const db = admin.firestore();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://www.gstatic.com", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https://*.firebaseio.com", "https://*.googleapis.com"]
        },
    },
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 
        ['https://your-domain.com', 'https://your-firevlyx-domain.com'] : 
        ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5000'],
    credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API Routes

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Admin authentication endpoint
app.post('/api/auth/login', (req, res) => {
    const { username, password } = req.body;

    // Simple hardcoded authentication (in production, use proper authentication)
    const ADMIN_USERNAME = 'Rajvignesh';
    const ADMIN_PASSWORD = 'RK1234@';

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        res.json({
            success: true,
            user: {
                username: username,
                role: 'admin',
                loginTime: new Date().toISOString()
            }
        });
    } else {
        res.status(401).json({
            success: false,
            error: 'Invalid credentials'
        });
    }
});

// Customer management endpoints
app.post('/api/customers', async (req, res) => {
    try {
        const { name, mobile } = req.body;

        if (!name || !mobile) {
            return res.status(400).json({
                success: false,
                error: 'Name and mobile number are required'
            });
        }

        // Generate unique customer ID
        const customerId = 'RK' + Math.floor(1000 + Math.random() * 9000);

        // Check if Firebase is available
        if (!admin.apps.length) {
            // Fallback response when Firebase is not available
            return res.json({
                success: true,
                customerId: customerId,
                customerData: {
                    customerId,
                    name,
                    mobile,
                    stamps: [false, false, false, false, false, false],
                    completed: false,
                    createdDate: new Date().toISOString()
                }
            });
        }

        // Create customer document
        const customerData = {
            customerId,
            name,
            mobile,
            createdDate: admin.firestore.FieldValue.serverTimestamp(),
            stamps: [false, false, false, false, false, false],
            completed: false,
            totalVisits: 0
        };

        await db.collection('customers').doc(customerId).set(customerData);

        res.json({
            success: true,
            customerId,
            customerData: {
                ...customerData,
                createdDate: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error creating customer:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create customer'
        });
    }
});

// Get customer by ID or mobile
app.get('/api/customers/:identifier', async (req, res) => {
    try {
        const identifier = req.params.identifier;

        if (!admin.apps.length) {
            return res.status(503).json({
                success: false,
                error: 'Database service unavailable'
            });
        }

        let customerDoc;

        // Try to get by customer ID first
        if (identifier.startsWith('RK')) {
            customerDoc = await db.collection('customers').doc(identifier).get();
        } else {
            // Search by mobile number
            const mobileQuery = await db.collection('customers')
                .where('mobile', '==', identifier)
                .limit(1)
                .get();

            if (!mobileQuery.empty) {
                customerDoc = mobileQuery.docs[0];
            }
        }

        if (customerDoc && customerDoc.exists) {
            const data = customerDoc.data();
            res.json({
                success: true,
                customer: {
                    customerId: data.customerId,
                    name: data.name,
                    mobile: data.mobile,
                    stamps: data.stamps,
                    completed: data.completed,
                    totalVisits: data.totalVisits || 0,
                    createdDate: data.createdDate,
                    lastStampDate: data.lastStampDate
                }
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Customer not found'
            });
        }

    } catch (error) {
        console.error('Error getting customer:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get customer'
        });
    }
});

// Update customer stamps
app.put('/api/customers/:customerId/stamps', async (req, res) => {
    try {
        const { customerId } = req.params;
        const { stamps } = req.body;

        if (!stamps || !Array.isArray(stamps) || stamps.length !== 6) {
            return res.status(400).json({
                success: false,
                error: 'Invalid stamps data'
            });
        }

        if (!admin.apps.length) {
            return res.status(503).json({
                success: false,
                error: 'Database service unavailable'
            });
        }

        const completedStamps = stamps.filter(stamp => stamp).length;
        const isCompleted = completedStamps === 6;

        await db.collection('customers').doc(customerId).update({
            stamps: stamps,
            completed: isCompleted,
            totalVisits: completedStamps,
            lastStampDate: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            completed: isCompleted
        });

    } catch (error) {
        console.error('Error updating stamps:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update stamps'
        });
    }
});

// Get all customers
app.get('/api/customers', async (req, res) => {
    try {
        if (!admin.apps.length) {
            return res.status(503).json({
                success: false,
                error: 'Database service unavailable'
            });
        }

        const snapshot = await db.collection('customers')
            .orderBy('createdDate', 'desc')
            .get();

        const customers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            customers.push({
                customerId: data.customerId,
                name: data.name,
                mobile: data.mobile,
                stamps: data.stamps,
                completed: data.completed,
                totalVisits: data.totalVisits || 0,
                createdDate: data.createdDate,
                lastStampDate: data.lastStampDate
            });
        });

        res.json({
            success: true,
            customers: customers
        });

    } catch (error) {
        console.error('Error getting customers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get customers'
        });
    }
});

// Delete customer
app.delete('/api/customers/:customerId', async (req, res) => {
    try {
        const { customerId } = req.params;

        if (!admin.apps.length) {
            return res.status(503).json({
                success: false,
                error: 'Database service unavailable'
            });
        }

        await db.collection('customers').doc(customerId).delete();

        res.json({
            success: true
        });

    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete customer'
        });
    }
});

// Get dashboard statistics
app.get('/api/stats', async (req, res) => {
    try {
        if (!admin.apps.length) {
            return res.json({
                success: true,
                stats: {
                    totalCustomers: 0,
                    completedCards: 0,
                    totalStamps: 0,
                    freeRewards: 0
                }
            });
        }

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

        res.json({
            success: true,
            stats: {
                totalCustomers,
                completedCards,
                totalStamps,
                freeRewards: completedCards
            }
        });

    } catch (error) {
        console.error('Error getting stats:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get statistics'
        });
    }
});

// CSV export endpoint
app.get('/api/export/csv', async (req, res) => {
    try {
        if (!admin.apps.length) {
            return res.status(503).json({
                success: false,
                error: 'Database service unavailable'
            });
        }

        const snapshot = await db.collection('customers')
            .orderBy('createdDate', 'desc')
            .get();

        const customers = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            customers.push({
                customerId: data.customerId,
                name: data.name,
                mobile: data.mobile,
                stamps: data.stamps.map(s => s ? '1' : '0').join(''),
                completed: data.completed ? 'Yes' : 'No',
                totalVisits: data.totalVisits || 0,
                createdDate: data.createdDate ? data.createdDate.toDate().toLocaleDateString() : 'N/A'
            });
        });

        // Generate CSV content
        const headers = ['Customer ID', 'Name', 'Mobile', 'Stamps', 'Completed', 'Total Visits', 'Created Date'];
        const csvContent = [
            headers.join(','),
            ...customers.map(customer => [
                customer.customerId,
                `"${customer.name}"`,
                customer.mobile,
                customer.stamps,
                customer.completed,
                customer.totalVisits,
                customer.createdDate
            ].join(','))
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="rk-dragon-customers-${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);

    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to export CSV'
        });
    }
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// Serve main page for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🐉 RK Dragon Panipuri Loyalty System running on port ${PORT}`);
    console.log(`🌐 Open http://localhost:${PORT} to view the application`);
    console.log(`📊 Admin panel: http://localhost:${PORT}/admin`);
    console.log(`🔥 Firebase integration: ${admin.apps.length > 0 ? 'Active' : 'Inactive'}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;