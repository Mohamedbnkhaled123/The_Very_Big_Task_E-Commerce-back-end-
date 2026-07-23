const express = require("express");
const router = express.Router();
const { login, register, resetPassword } = require("../controllers/auth.controller");

// Authentication routes
router.post('/login', login);
router.post('/register', register);
router.post('/forgot-password', resetPassword);

module.exports = router;