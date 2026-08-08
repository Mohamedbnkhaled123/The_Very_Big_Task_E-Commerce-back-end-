const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    items: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        priceAtPurchase: {
            type: Number,
            required: true,
            min: 0
        },
        discountPercent: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        discountedPrice: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    grossTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    shippingFee: {
        type: Number,
        default: 0,
        min: 0
    },
    totalDiscount: {
        type: Number,
        default: 0,
        min: 0
    },
    netTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },
    orderStatus: {
        type: String,
        enum: [
            "pending", 
            "prepared", 
            "shipped", 
            "received", 
            "rejected", 
            "cancelledByAdmin", 
            "cancelledByUser",
            "returned",
            "refunded"
        ],
        default: "pending"
    },
    shippingAddress: {
        title: String,
        city: String,
        street: String,
        buildingNumber: String,
        floorNumber: String,
        phoneNumber: String
    }
}, { timestamps: true });

// Compound index for high-performance analytics aggregation
orderSchema.index({ createdAt: -1, orderStatus: 1 });

module.exports = mongoose.model("Order", orderSchema);