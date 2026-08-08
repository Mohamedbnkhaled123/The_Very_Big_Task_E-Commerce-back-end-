const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const AppError = require('../utilities/appError.utility.js');
const catchAsync = require('../utilities/catchAsync.utility.js');
const { validatePasswordStrength, validateEmail } = require('../utilities/validation.utility.js');

// Generates JWT auth token
const signToken = (user) => {
    return jwt.sign(
        { id: user._id, name: user.name, role: user.role },
        process.env.SECRET_KEY,
        { expiresIn: process.env.JWT_EXPIRES_IN }
    );
};

// Authenticates user and generates token
exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return next(new AppError("Please provide email and password!", 400));
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
        return next(new AppError(emailCheck.error, 400));
    }

    const myUser = await User.findOne({ email });
    if (!myUser) {
        return next(new AppError(`Can't find user with this email: ${email}`, 404));
    }

    if (!await myUser.correctPassword(password)) {
        return next(new AppError("Can't login, password is incorrect", 401));
    }

    if ((myUser.role === 'admin' || myUser.role === 'superadmin') && myUser.isActive === false) {
        return next(new AppError("Your admin account has been deactivated by the Super Admin.", 403));
    }

    // Update lastActiveAt on successful login
    myUser.lastActiveAt = new Date();
    await myUser.save({ validateBeforeSave: false });

    if (req.body.localCart && Array.isArray(req.body.localCart)) {
        const Product = require("../models/product.model");
        
        for (const localItem of req.body.localCart) {
            const itemIndex = myUser.cart.findIndex(dbItem => dbItem.productId.toString() === localItem.productId);

            if (itemIndex > -1) {
                myUser.cart[itemIndex].quantity += localItem.quantity;
            } else {
                const product = await Product.findOne({ _id: localItem.productId, isDeleted: false, isActive: true });
                if (product) {
                    myUser.cart.push({
                        productId: localItem.productId,
                        quantity: localItem.quantity,
                        priceAtAddition: product.price
                    });
                }
            }
        }
        await myUser.save();
    }

    const token = signToken(myUser);
    res.status(200).json({ 
        status: "success",
        JWT: token,
        data: {
            id: myUser._id,
            name: myUser.name,
            email: myUser.email,
            role: myUser.role
        }
    });
});

// Registers new user account
exports.register = catchAsync(async (req, res, next) => {
    const { name, email, password, phoneNumbers, addresses } = req.body;

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
        return next(new AppError(emailCheck.error, 400));
    }

    if (!validatePasswordStrength(password)) {
        return next(new AppError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.", 400));
    }

    const newUser = await User.create({
        name,
        email,
        password,
        phoneNumbers,
        addresses
    });

    const token = signToken(newUser);

    res.status(201).json({
        status: "success",
        JWT: token,
        data: {
            id: newUser._id,
            name: newUser.name,
            email: newUser.email
        }
    });
});

// Step 1: Requests OTP reset token by email
exports.forgotPassword = catchAsync(async (req, res, next) => {
    const { email } = req.body;

    if (!email) {
        return next(new AppError("Please provide your account email address!", 400));
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
        return next(new AppError(emailCheck.error, 400));
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
        return next(new AppError("No registered account found with this email address!", 404));
    }

    // Generate 6-digit random OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP and store in DB with 15-minute expiration
    user.passwordResetToken = crypto.createHash("sha256").update(otp).digest("hex");
    user.passwordResetExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Print OTP in console for local testing
    console.log(`\n==========================================`);
    console.log(`🔑 DEV MODE RESET OTP for [${user.email}]: ${otp}`);
    console.log(`==========================================\n`);

    const responsePayload = {
        status: "success",
        message: "Reset code generated! Please check your email or console log."
    };

    // Return devOtp in development mode for easy local testing
    if (process.env.NODE_ENV !== 'production') {
        responsePayload.devOtp = otp;
    }

    res.status(200).json(responsePayload);
});

// Step 2: Verifies OTP token and updates password
exports.resetPassword = catchAsync(async (req, res, next) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return next(new AppError("Please provide email, verification code, and new password!", 400));
    }

    if (!validatePasswordStrength(newPassword)) {
        return next(new AppError("New password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number.", 400));
    }

    const hashedOtp = crypto.createHash("sha256").update(otp.toString().trim()).digest("hex");

    const user = await User.findOne({
        email: email.toLowerCase().trim(),
        passwordResetToken: hashedOtp,
        passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
        return next(new AppError("Verification code is invalid or has expired! Please request a new code.", 400));
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({
        status: "success",
        message: "Password updated successfully! You can now log in with your new password."
    });
});