const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, 'Coupon promo code is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    discountPercent: {
        type: Number,
        required: [true, 'Discount percentage is required'],
        min: [1, 'Discount percent must be at least 1%'],
        max: [100, 'Discount percent cannot exceed 100%']
    },
    maxDiscountAmount: {
        type: Number,
        default: null // Optional max ceiling in EGP
    },
    minOrderAmount: {
        type: Number,
        default: 0 // Optional minimum order spend requirement
    },
    expiresAt: {
        type: Date,
        default: null // Optional expiration timestamp
    },
    isActive: {
        type: Boolean,
        default: true
    },
    usageLimit: {
        type: Number,
        default: null // Optional max global redemptions
    },
    usageCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
