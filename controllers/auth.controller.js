const User = require('../models/user.model');
const jwt = require('jsonwebtoken');
const AppError = require('../utilities/appError.utility.js');
const catchAsync = require('../utilities/catchAsync.utility.js');

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

    const myUser = await User.findOne({ email });
    if (!myUser) {
        return next(new AppError(`Can't find user with this email: ${email}`, 404));
    }

    if (!await myUser.correctPassword(password)) {
        return next(new AppError("Can't login, password is incorrect", 401));
    }

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
        JWT: token 
    });
});

// Registers new user account
exports.register = catchAsync(async (req, res, next) => {
    const { name, email, password, phoneNumbers, addresses } = req.body;

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

// Resets user password by email
exports.resetPassword = catchAsync(async (req, res, next) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return next(new AppError("Please provide both email and new password!", 400));
    }

    if (newPassword.length < 6) {
        return next(new AppError("Password must be at least 6 characters long!", 400));
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
        return next(new AppError("No registered account found with this email address!", 404));
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
        status: "success",
        message: "Password updated successfully! You can now log in with your new password."
    });
});