const Contact = require("../models/contact.model");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

// @desc    Create a new contact message (Public)
// @route   POST /api/v1/contact
// @access  Public
exports.createMessage = catchAsync(async (req, res, next) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return next(new AppError("Please provide all required fields", 400));
    }

    const newMessage = await Contact.create({
        name,
        email,
        subject,
        message
    });

    // Emit live socket event for real-time inbox
    const io = req.app.get("io");
    if (io) {
        io.emit("new_contact_message", newMessage);
    }

    res.status(201).json({
        status: "success",
        message: "Your message has been sent successfully!",
        data: newMessage
    });
});

// @desc    Get all contact messages with pagination (Admin)
// @route   GET /api/v1/contact
// @access  Private/Admin
exports.getMessages = catchAsync(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [messages, totalResults] = await Promise.all([
        Contact.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
        Contact.countDocuments()
    ]);

    const totalPages = Math.ceil(totalResults / limit) || 1;

    res.status(200).json({
        status: "success",
        results: messages.length,
        totalResults,
        totalPages,
        currentPage: page,
        data: messages
    });
});

// @desc    Mark a message as read (Admin)
// @route   PATCH /api/v1/contact/:id/read
// @access  Private/Admin
exports.markAsRead = catchAsync(async (req, res, next) => {
    const message = await Contact.findByIdAndUpdate(
        req.params.id,
        { isRead: true },
        { new: true, runValidators: true }
    );

    if (!message) {
        return next(new AppError("Message not found", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Message marked as read",
        data: message
    });
});

// @desc    Delete a message (Admin)
// @route   DELETE /api/v1/contact/:id
// @access  Private/Admin
exports.deleteMessage = catchAsync(async (req, res, next) => {
    const message = await Contact.findByIdAndDelete(req.params.id);

    if (!message) {
        return next(new AppError("Message not found", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Message deleted successfully"
    });
});
