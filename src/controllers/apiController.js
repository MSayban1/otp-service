const { createOTP, verifyOTP } = require('../services/otpService');
const { sendMail, verifySMTP } = require('../services/emailService');
const { generateApiKey } = require('../services/apiKeyService');
const { parseTemplate } = require('../utils/templateParser');

const getApiController = (db) => ({
    // Generate API Key
    generateApiKey: async (req, res) => {
        try {
            const { name } = req.body;
            const apiKey = await generateApiKey(db, name);
            res.json({ apiKey });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Update SMTP Settings
    updateSmtp: async (req, res) => {
        try {
            const { host, port, user, pass, senderName } = req.body;

            // Validate SMTP first
            const isValid = await verifySMTP({
                smtp_host: host,
                smtp_port: parseInt(port),
                smtp_user: user,
                smtp_pass: pass
            });

            if (!isValid) {
                return res.status(400).json({ error: 'Invalid SMTP credentials' });
            }

            await db.run(
                `INSERT OR REPLACE INTO settings (id, smtp_host, smtp_port, smtp_user, smtp_pass, sender_name) 
                 VALUES (1, ?, ?, ?, ?, ?)`,
                [host, parseInt(port), user, pass, senderName]
            );

            res.json({ message: 'SMTP settings updated successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Create Email Template
    createTemplate: async (req, res) => {
        try {
            const { id, name, subject, body } = req.body;
            await db.run(
                'INSERT OR REPLACE INTO templates (id, name, subject, body) VALUES (?, ?, ?, ?)',
                [id, name, subject, body]
            );
            res.json({ message: 'Template created/updated successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Delete Email Template
    deleteTemplate: async (req, res) => {
        try {
            const { id } = req.params;
            await db.run('DELETE FROM templates WHERE id = ?', [id]);
            res.json({ message: 'Template deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Delete API Key
    deleteApiKey: async (req, res) => {
        try {
            const { key } = req.params;
            await db.run('DELETE FROM api_keys WHERE key = ?', [key]);
            res.json({ message: 'API Key deleted successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Send OTP
    sendOtp: async (req, res) => {
        try {
            const { email, templateId, templateData } = req.body;

            // 1. Get Template
            const template = await db.get('SELECT * FROM templates WHERE id = ?', [templateId]);
            if (!template) {
                return res.status(404).json({ error: 'Template not found' });
            }

            // 2. Get SMTP Settings
            const settings = await db.get('SELECT * FROM settings WHERE id = 1');
            if (!settings) {
                return res.status(400).json({ error: 'SMTP not configured' });
            }

            // 3. Generate OTP
            const otpCode = await createOTP(db, email);

            // 4. Prepare Email Content
            const emailData = {
                OTP: otpCode,
                otp: otpCode, // Alias for lowercase
                ...templateData
            };

            // Add 'user' alias if USERNAME is provided
            if (emailData.USERNAME) {
                emailData.user = emailData.USERNAME;
            } else if (!emailData.user) {
                emailData.user = 'Valued User'; // Fallback
            }

            const htmlBody = parseTemplate(template.body, emailData);
            const subject = parseTemplate(template.subject, emailData);

            // 5. Send Email
            await sendMail(settings, {
                to: email,
                subject: subject,
                html: htmlBody
            });

            res.json({ message: 'OTP sent successfully' });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Verify OTP
    verifyOtp: async (req, res) => {
        try {
            const { email, code } = req.body;
            const result = await verifyOTP(db, email, code);

            if (!result.valid) {
                return res.status(400).json({ error: result.message });
            }

            res.json({ message: result.message });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    },

    // Get Data (for dashboard)
    getDashboardData: async (req, res) => {
        try {
            const settings = await db.get('SELECT smtp_host, smtp_port, smtp_user, sender_name FROM settings WHERE id = 1');
            const templates = await db.all('SELECT * FROM templates');
            const apiKeys = await db.all('SELECT * FROM api_keys');
            const logs = await db.all('SELECT * FROM otps ORDER BY created_at DESC LIMIT 50');

            res.json({ settings, templates, apiKeys, logs });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
});

module.exports = { getApiController };
