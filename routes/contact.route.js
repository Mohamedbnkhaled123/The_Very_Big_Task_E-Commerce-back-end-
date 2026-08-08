const express = require("express");
const contactController = require("../controllers/contact.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Strict rate limiter for contact form: max 3 submissions per 15 minutes per IP
const contactLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3,
    message: {
        status: "error",
        message: "Too many messages sent from this IP, please try again after 15 minutes."
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Public route for customers to send messages
router.post("/", contactLimiter, contactController.createMessage);

// Protected routes for Admins
router.use(authenticate, authorize("admin", "superadmin"));

router.get("/", contactController.getMessages);
router.patch("/:id/read", contactController.markAsRead);
router.delete("/:id", contactController.deleteMessage);

module.exports = router;
