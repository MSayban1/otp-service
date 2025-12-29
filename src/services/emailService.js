require('dotenv').config();
const nodemailer = require('nodemailer');

async function getTransporter(settings) {
    if (!settings || !settings.smtp_host) {
        throw new Error('SMTP settings not configured');
    }

    return nodemailer.createTransport({
        host: settings.smtp_host,
        port: settings.smtp_port,
        secure: settings.smtp_port === 465, // true for 465, false for other ports
        auth: {
            user: settings.smtp_user,
            pass: settings.smtp_pass
        }
    });
}

async function verifySMTP(config) {
    const transporter = nodemailer.createTransport({
        host: config.smtp_host,
        port: config.smtp_port,
        secure: config.smtp_port === 465,
        auth: {
            user: config.smtp_user,
            pass: config.smtp_pass
        }
    });

    try {
        await transporter.verify();
        return true;
    } catch (error) {
        console.error('SMTP Verification Error:', error);
        return false;
    }
}

async function sendMail(settings, { to, subject, html }) {
    const transporter = await getTransporter(settings);

    const mailOptions = {
        from: `"${settings.sender_name}" <${settings.smtp_user}>`,
        to,
        subject,
        html
    };

    return await transporter.sendMail(mailOptions);
}

module.exports = { sendMail, verifySMTP };
