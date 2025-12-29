require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDb } = require('./src/config/db');
const { setupRoutes } = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
    res.header('Access-Control-Max-Age', '86400');

    if (req.method === 'OPTIONS') {
        res.header('Access-Control-Allow-Private-Network', 'true');
        return res.sendStatus(200);
    }
    next();
});

// Basic Health/Status check
app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        timestamp: new Date().toISOString(),
        node_env: process.env.NODE_ENV || 'development'
    });
});
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per window
    message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

async function startServer() {
    try {
        const db = await initDb();
        console.log('Database initialized.');

        // Setup Routes
        app.use('/api', setupRoutes(db));

        // Health check for deployment
        app.get('/', (req, res) => res.status(200).send('OTP Service is running.'));

        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running on port ${PORT}`);
        });

        // Catch-all 404 for debugging
        app.use((req, res) => {
            console.log(`404: ${req.method} ${req.url}`);
            res.status(404).json({ error: `Path ${req.url} not found` });
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
