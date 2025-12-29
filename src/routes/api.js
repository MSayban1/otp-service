const express = require('express');
const { getApiController } = require('../controllers/apiController');
const { authenticateApiKey } = require('../middleware/auth');
const { authenticateAdmin } = require('../middleware/sessionAuth');

const router = express.Router();

const setupRoutes = (db) => {
    const controller = getApiController(db);
    const authKey = authenticateApiKey(db);
    const authAdmin = authenticateAdmin;

    // Public Auth
    router.post('/login', controller.login);

    // Admin Dashboard Endpoints (Protected by Admin Session/Token)
    router.get('/systems', authAdmin, controller.getSystems);
    router.post('/system', authAdmin, controller.createSystem);
    router.delete('/system/:id', authAdmin, controller.deleteSystem);

    router.post('/update-smtp', authAdmin, controller.updateSmtp);
    router.post('/create-template', authAdmin, controller.createTemplate);
    router.delete('/template/:id', authAdmin, controller.deleteTemplate);
    router.get('/dashboard-data', authAdmin, controller.getDashboardData);

    // API Integration endpoints (Protected by API Key)
    router.post('/send-otp', authKey, controller.sendOtp);
    router.post('/verify-otp', authKey, controller.verifyOtp);

    return router;
};

module.exports = { setupRoutes };
