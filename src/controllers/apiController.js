const { createOTP, verifyOTP } = require('../services/otpService');
const { sendMail, verifySMTP } = require('../services/emailService');
const { generateApiKey } = require('../services/apiKeyService');
const { parseTemplate } = require('../utils/templateParser');
const { v4: uuidv4 } = require('uuid');

const getApiController = (db) => ({
    // Auth
    login: async (req, res) => {
        try {
            const { username, password } = req.body;
            const admin = await db.get('SELECT * FROM admins WHERE username = ? AND password = ?', [username, password]);

            if (!admin) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // In a real app, generate a JWT. For this personal tool, we use a fixed session token.
            // We'll use the password as a simple token for now as requested.
            const token = process.env.ADMIN_SESSION_TOKEN || 'admin-secret-token';
            res.json({ message: 'Login successful', token });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // System CRUD
    createSystem: async (req, res) => {
        try {
            const { name } = req.body;
            const systemId = uuidv4();
            const apiKey = await generateApiKey();

            await db.run(
                'INSERT INTO systems (id, name, api_key) VALUES (?, ?, ?)',
                [systemId, name, apiKey]
            );

            res.json({ message: 'System created successfully', systemId, apiKey });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getSystems: async (req, res) => {
        try {
            const systems = await db.all('SELECT * FROM systems ORDER BY created_at DESC');
            res.json(systems);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteSystem: async (req, res) => {
        try {
            const { id } = req.params;
            await db.run('DELETE FROM systems WHERE id = ?', [id]);
            res.json({ message: 'System deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Scoped Configuration
    updateSmtp: async (req, res) => {
        try {
            const { systemId, host, port, user, pass, senderName, senderPicture, smtpService } = req.body;

            // Validate SMTP first if it's a direct SMTP configuration
            if (host && port) {
                const isValid = await verifySMTP({
                    smtp_host: host,
                    smtp_port: parseInt(port),
                    smtp_user: user,
                    smtp_pass: pass
                });

                if (!isValid) {
                    return res.status(400).json({ error: 'Invalid SMTP credentials' });
                }
            }

            await db.run(
                `UPDATE systems SET 
                    smtp_service = ?, smtp_host = ?, smtp_port = ?, 
                    smtp_user = ?, smtp_pass = ?, sender_name = ?, sender_picture = ?
                 WHERE id = ?`,
                [smtpService || 'gmail', host, parseInt(port) || null, user, pass, senderName, senderPicture, systemId]
            );

            res.json({ message: 'System configuration updated successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Scoped Templates
    createTemplate: async (req, res) => {
        try {
            const { systemId, id, name, subject, body } = req.body;
            await db.run(
                'INSERT OR REPLACE INTO templates (id, system_id, name, subject, body) VALUES (?, ?, ?, ?, ?)',
                [id, systemId, name, subject, body]
            );
            res.json({ message: 'Template created/updated successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    deleteTemplate: async (req, res) => {
        try {
            const { id } = req.params;
            // Templates are now identified by ID
            await db.run('DELETE FROM templates WHERE id = ?', [id]);
            res.json({ message: 'Template deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Send OTP (Scoped by API Key in middleware)
    sendOtp: async (req, res) => {
        try {
            const { email, templateId, templateData } = req.body;
            const system = req.system; // Attached by authenticateApiKey middleware

            // 1. Get Template for this system
            const template = await db.get('SELECT * FROM templates WHERE id = ? AND system_id = ?', [templateId, system.id]);
            if (!template) {
                return res.status(404).json({ error: 'Template not found for this system' });
            }

            // 2. Check SMTP Settings in the system
            if (!system.smtp_user || (!system.smtp_pass && system.smtp_service === 'gmail')) {
                return res.status(400).json({ error: 'SMTP not configured for this system' });
            }

            // 3. Generate OTP
            const otpCode = await createOTP(db, email, system.id);

            // 4. Prepare Email Content
            const emailData = {
                OTP: otpCode,
                otp: otpCode,
                ...templateData
            };

            if (emailData.USERNAME) {
                emailData.user = emailData.USERNAME;
            } else if (!emailData.user) {
                emailData.user = 'Valued User';
            }

            const htmlBody = parseTemplate(template.body, emailData);
            const subject = parseTemplate(template.subject, emailData);

            // 5. Send Email using system settings
            await sendMail(system, {
                to: email,
                subject: subject,
                html: htmlBody
            });

            res.json({ message: 'OTP sent successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    verifyOtp: async (req, res) => {
        try {
            const { email, code } = req.body;
            const system = req.system;
            const result = await verifyOTP(db, email, code, system.id);

            if (!result.valid) {
                return res.status(400).json({ error: result.message });
            }

            res.json({ message: result.message });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    getDashboardData: async (req, res) => {
        try {
            const { systemId } = req.query;
            const systems = await db.all('SELECT id, name, api_key, sender_picture FROM systems');

            let currentSystem = null;
            let templates = [];
            let logs = [];

            if (systemId) {
                currentSystem = await db.get('SELECT * FROM systems WHERE id = ?', [systemId]);
                templates = await db.all('SELECT * FROM templates WHERE system_id = ?', [systemId]);
                logs = await db.all('SELECT * FROM otps WHERE system_id = ? ORDER BY created_at DESC LIMIT 50', [systemId]);
            }

            res.json({ systems, currentSystem, templates, logs });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = { getApiController };
