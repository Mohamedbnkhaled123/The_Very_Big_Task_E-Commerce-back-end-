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
        }
    }],
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
            "cancelledByUser"
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

module.exports = mongoose.model("Order", orderSchema);