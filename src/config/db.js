const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const dbPath = path.resolve(__dirname, '../../database.sqlite');

async function initDb() {
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    // 1. Systems Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS systems (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            api_key TEXT UNIQUE NOT NULL,
            smtp_service TEXT DEFAULT 'gmail',
            smtp_host TEXT,
            smtp_port INTEGER,
            smtp_user TEXT,
            smtp_pass TEXT,
            sender_name TEXT,
            sender_picture TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 2. Admins Table
    await db.exec(`
        CREATE TABLE IF NOT EXISTS admins (
            username TEXT PRIMARY KEY,
            password TEXT NOT NULL
        )
    `);

    // Insert default admin if not exists
    await db.run('INSERT OR IGNORE INTO admins (username, password) VALUES (?, ?)', ['admin', 'admin11223344']);

    // 3. Update Templates Table (add system_id)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS templates_new (
            id TEXT PRIMARY KEY,
            system_id TEXT NOT NULL,
            name TEXT NOT NULL,
            subject TEXT NOT NULL,
            body TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
        )
    `);

    // 4. Update OTPs Table (add system_id)
    await db.exec(`
        CREATE TABLE IF NOT EXISTS otps_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            system_id TEXT NOT NULL,
            email TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            used INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (system_id) REFERENCES systems (id) ON DELETE CASCADE
        )
    `);

    // MIGRATION LOGIC
    const settings = await db.get('SELECT * FROM settings WHERE id = 1');
    const existingSystems = await db.get('SELECT COUNT(*) as count FROM systems');

    if (settings && existingSystems.count === 0) {
        console.log('Migrating existing settings to Default System...');
        const defaultSystemId = 'default';
        const defaultApiKey = (await db.get('SELECT key FROM api_keys LIMIT 1'))?.key || 'sk_default_' + Math.random().toString(36).substring(7);

        await db.run(`
            INSERT INTO systems (id, name, api_key, smtp_host, smtp_port, smtp_user, smtp_pass, sender_name)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            defaultSystemId, 'Default System', defaultApiKey,
            settings.smtp_host, settings.smtp_port, settings.smtp_user, settings.smtp_pass, settings.sender_name
        ]);

        // Migrate templates
        await db.run('INSERT INTO templates_new (id, system_id, name, subject, body, created_at) SELECT id, ?, name, subject, body, created_at FROM templates', [defaultSystemId]);

        // Finalize table replacements
        await db.exec('DROP TABLE templates');
        await db.exec('ALTER TABLE templates_new RENAME TO templates');
        await db.exec('DROP TABLE otps');
        await db.exec('ALTER TABLE otps_new RENAME TO otps');
        await db.exec('DROP TABLE settings');
        await db.exec('DROP TABLE api_keys');
    } else {
        // Ensure new tables are active for fresh installs
        const hasTemplates = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='templates'");
        if (hasTemplates) {
            const tableInfo = await db.all("PRAGMA table_info(templates)");
            if (!tableInfo.find(c => c.name === 'system_id')) {
                // Fresh run but old schema exists without migration triggered (rare)
                await db.exec('DROP TABLE IF EXISTS templates_new');
                await db.exec('DROP TABLE IF EXISTS otps_new');
            }
        }
    }

    return db;
}

module.exports = { initDb };
