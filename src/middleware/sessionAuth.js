const authenticateAdmin = (req, res, next) => {
    // Simple authentication check using a session-like approach
    // In a full production app, you'd use express-session or JWT
    // For this personal tool, we check for a specific cookie or header

    const adminToken = req.headers['authorization'] || req.cookies?.admin_token;

    // We'll define the admin token as a simple hash or just a unique string for now
    // This will be set upon successful login in the controller
    if (adminToken === process.env.ADMIN_SESSION_TOKEN) {
        return next();
    }

    res.status(401).json({ error: 'Unauthorized. Please login.' });
};

module.exports = { authenticateAdmin };
