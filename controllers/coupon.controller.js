const Coupon = require('../models/coupon.model');
const catchAsync = require('../utilities/catchAsync.utility');
const AppError = require('../utilities/appError.utility');

// Creates a new promotional coupon
exports.createCoupon = catchAsync(async (req, res, next) => {
    let { code, discountPercent, maxDiscountAmount, minOrderAmount, expiresAt, usageLimit } = req.body || {};

    if (!code || !discountPercent) {
        return next(new AppError('Please provide a coupon Code and Discount Percent.', 400));
    }

    code = code.trim().toUpperCase();

    const existing = await Coupon.findOne({ code });
    if (existing) {
        return next(new AppError(`Coupon code '${code}' already exists!`, 400));
    }

    const coupon = await Coupon.create({
        code,
        discountPercent: Number(discountPercent),
        maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
        minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        usageLimit: usageLimit ? Number(usageLimit) : null
    });

    res.status(201).json({
        status: 'success',
        message: `Coupon '${coupon.code}' created successfully!`,
        data: coupon
    });
});

// Fetches all coupons for Admin management
exports.getAllCoupons = catchAsync(async (req, res, next) => {
    const coupons = await Coupon.find().sort('-createdAt');
    res.status(200).json({
        status: 'success',
        results: coupons.length,
        data: coupons
    });
});

// Toggles coupon active status
exports.toggleCouponStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const coupon = await Coupon.findById(id);

    if (!coupon) {
        return next(new AppError('Coupon not found.', 404));
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
        status: 'success',
        message: `Coupon '${coupon.code}' is now ${coupon.isActive ? 'Active' : 'Disabled'}.`,
        data: coupon
    });
});

// Deletes a coupon
exports.deleteCoupon = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
        return next(new AppError('Coupon not found.', 404));
    }

    res.status(200).json({
        status: 'success',
        message: `Coupon '${coupon.code}' deleted successfully.`
    });
});

// Validates a promo coupon code at checkout
exports.validateCoupon = catchAsync(async (req, res, next) => {
    const { code, orderSubtotal } = req.body || {};

    if (!code) {
        return next(new AppError('Please provide a coupon code.', 400));
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode, isActive: true });

    if (!coupon) {
        return next(new AppError('Invalid or expired coupon promo code.', 404));
    }

    // Check expiration date
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return next(new AppError('This coupon code has expired.', 400));
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return next(new AppError('This coupon code has reached its maximum usage limit.', 400));
    }

    // Check minimum spend requirement
    const subtotal = Number(orderSubtotal || 0);
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
        return next(new AppError(`This coupon requires a minimum spend of EGP ${coupon.minOrderAmount.toFixed(2)}.`, 400));
    }

    // Calculate discount amount
    let discountAmount = (subtotal * coupon.discountPercent) / 100;
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
    }

    res.status(200).json({
        status: 'success',
        message: `Coupon '${coupon.code}' applied successfully! (${coupon.discountPercent}% OFF)`,
        data: {
            code: coupon.code,
            discountPercent: coupon.discountPercent,
            discountAmount,
            minOrderAmount: coupon.minOrderAmount
        }
    });
});
