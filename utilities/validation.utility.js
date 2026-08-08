/**
 * Validates password strength according to enterprise security standards.
 * Requirements: Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, and 1 digit.
 * 
 * @param {string} password 
 * @returns {boolean}
 */
exports.validatePasswordStrength = (password) => {
    if (!password || typeof password !== 'string') return false;
    const hasMinLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    return hasMinLength && hasUpper && hasLower && hasNumber;
};

// Re-export email validator from dedicated module for a single import path
const { validateEmail } = require('./email.validator');
exports.validateEmail = validateEmail;

