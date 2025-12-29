const { v4: uuidv4 } = require('uuid');

async function generateApiKey() {
    return `sk_${uuidv4().replace(/-/g, '')}`;
}

async function getSystemByApiKey(db, key) {
    return await db.get('SELECT * FROM systems WHERE api_key = ?', [key]);
}

module.exports = { generateApiKey, getSystemByApiKey };
