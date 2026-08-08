const rateLimit = require('express-rate-limit');

// Limits authentication API requests to prevent Brute-Force and DoS attacks
exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: 15,                  // Max 15 attempts per IP per window
    message: {
        status: 'fail',
        message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
