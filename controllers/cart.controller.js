const User = require("../models/user.model");
const Product = require("../models/product.model");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

// Adds product to user cart
exports.addToCart = catchAsync(async (req, res, next) => {
    const { productId, quantity } = req.body;
    const userId = req.user._id;

    const product = await Product.findOne({ _id: productId, isDeleted: false, isActive: true });
    if (!product) {
        return next(new AppError("Product not found or unavailable", 404));
    }

    if (product.stock < quantity) {
        return next(new AppError(`Only ${product.stock} items available in stock`, 400));
    }

    const user = await User.findById(userId);

    const cartItemIndex = user.cart.findIndex(item => item.productId.toString() === productId);

    if (cartItemIndex > -1) {
        user.cart[cartItemIndex].quantity = quantity;
        user.cart[cartItemIndex].priceAtAddition = product.price;
        user.cart[cartItemIndex].isPriceChanged = false;
    } else {
        user.cart.push({
            productId,
            quantity,
            priceAtAddition: product.price
        });
    }

    await user.save();

    await user.populate("cart.productId");

    res.status(200).json({
        status: "success",
        message: "Product added to cart successfully",
        data: user.cart
    });
});

// Fetches user cart with live price check
exports.getMyCart = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("cart.productId");

    let isCartUpdated = false;

    for (const item of user.cart) {
        if (!item.productId || item.productId.isDeleted || !item.productId.isActive) {
            continue;
        }

        if (item.productId.price !== item.priceAtAddition) {
            item.priceAtAddition = item.productId.price;
            item.isPriceChanged = true;
            isCartUpdated = true;
        }
    }

    if (isCartUpdated) {
        await user.save();
    }

    res.status(200).json({
        status: "success",
        data: user.cart
    });
});

// Removes item from cart
exports.removeFromCart = catchAsync(async (req, res, next) => {
    const { productId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);

    user.cart = user.cart.filter(item => item.productId.toString() !== productId);
    await user.save();

    await user.populate("cart.productId");

    res.status(200).json({
        status: "success",
        message: "Item removed from cart successfully",
        data: user.cart
    });
});