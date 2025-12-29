const { v4: uuidv4 } = require('uuid');

async function generateApiKey(db, name = 'Default Key') {
    const key = `sk_${uuidv4().replace(/-/g, '')}`;
    await db.run('INSERT INTO api_keys (key, name) VALUES (?, ?)', [key, name]);
    return key;
}

async function isValidApiKey(db, key) {
    const apiKey = await db.get('SELECT * FROM api_keys WHERE key = ?', [key]);
    return !!apiKey;
}

module.exports = { generateApiKey, isValidApiKey };
