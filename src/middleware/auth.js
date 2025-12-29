const { getSystemByApiKey } = require('../services/apiKeyService');

const authenticateApiKey = (db) => async (req, res, next) => {
    const apiKey = req.headers['x-api-key']?.trim();

    if (!apiKey) {
        return res.status(401).json({ error: 'API key is required in x-api-key header' });
    }

    const system = await getSystemByApiKey(db, apiKey);
    if (!system) {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    // Attach system to request for further use in controllers
    req.system = system;
    next();
};

module.exports = { authenticateApiKey };
