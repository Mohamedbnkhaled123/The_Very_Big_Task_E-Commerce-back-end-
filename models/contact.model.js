const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide your name"],
            trim: true,
            maxlength: 100
        },
        email: {
            type: String,
            required: [true, "Please provide your email address"],
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                "Please provide a valid email address"
            ]
        },
        subject: {
            type: String,
            required: [true, "Please provide a subject"],
            trim: true,
            maxlength: 150
        },
        message: {
            type: String,
            required: [true, "Please provide a message"],
            trim: true,
            maxlength: 1000
        },
        isRead: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Contact", contactSchema);
