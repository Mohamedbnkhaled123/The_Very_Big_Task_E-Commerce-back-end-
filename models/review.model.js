const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Review must belong to a user"]
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: [true, "Review must be associated with a specific product"]
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: false
        },
        text: {
            type: String,
            required: false,
            trim: true,
            default: ""
        },
        rating: {
            type: Number,
            required: [true, "Review must have a rating"],
            min: 1,
            max: 5
        },
        status: {
            type: String,
            enum: ["Pending", "Approved", "Cancelled"],
            default: "Pending" // New reviews require Admin approval before appearing on product page
        }
    },
    { timestamps: true }
);

// Prevent duplicate reviews per user per product
reviewSchema.index({ userId: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);