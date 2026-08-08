const express = require("express");
const router = express.Router();
const { login, register, forgotPassword, resetPassword } = require("../controllers/auth.controller");

// Authentication routes
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;