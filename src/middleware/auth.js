const { isValidApiKey } = require('../services/apiKeyService');

const authenticateApiKey = (db) => async (req, res, next) => {
    const apiKey = req.headers['x-api-key']?.trim();

    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required in x-api-key header' });
    }

    const valid = await isValidApiKey(db, apiKey);
    if (!valid) {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    next();
};

module.exports = { authenticateApiKey };
