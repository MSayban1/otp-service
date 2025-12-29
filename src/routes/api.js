const express = require('express');
const { getApiController } = require('../controllers/apiController');
const { authenticateApiKey } = require('../middleware/auth');

const router = express.Router();

const setupRoutes = (db) => {
    const controller = getApiController(db);
    const auth = authenticateApiKey(db);

    // Public / Protected Admin endpoints (For personal use, we assume the dashboard is secured or run locally)
    // In a real multi-user scenario, these would have separate auth.
    router.post('/generate-api-key', controller.generateApiKey);
    router.delete('/api-key/:key', controller.deleteApiKey);
    router.post('/update-smtp', controller.updateSmtp);
    router.post('/create-template', controller.createTemplate);
    router.delete('/template/:id', controller.deleteTemplate);
    router.get('/dashboard-data', controller.getDashboardData);

    // API Integration endpoints (Protected by API Key)
    router.post('/send-otp', auth, controller.sendOtp);
    router.post('/verify-otp', auth, controller.verifyOtp);

    return router;
};

module.exports = { setupRoutes };
