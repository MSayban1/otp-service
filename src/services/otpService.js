const crypto = require('crypto');

function generate6DigitOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function createOTP(db, email) {
    const code = generate6DigitOTP();
    // Expiry 5 minutes from now
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await db.run(
        'INSERT INTO otps (email, code, expires_at) VALUES (?, ?, ?)',
        [email, code, expiresAt]
    );

    return code;
}

async function verifyOTP(db, email, code) {
    const otp = await db.get(
        'SELECT * FROM otps WHERE email = ? AND code = ? AND used = 0 ORDER BY created_at DESC LIMIT 1',
        [email, code]
    );

    if (!otp) {
        return { valid: false, message: 'Invalid OTP' };
    }

    const now = new Date();
    const expiresAt = new Date(otp.expires_at);

    if (now > expiresAt) {
        return { valid: false, message: 'OTP expired' };
    }

    // Mark as used
    await db.run('UPDATE otps SET used = 1 WHERE id = ?', [otp.id]);

    return { valid: true, message: 'OTP verified successfully' };
}

module.exports = { createOTP, verifyOTP };
