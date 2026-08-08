const User = require("../models/user.model");
const Product = require("../models/product.model");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

// Helper function to extract normalized string ID from cart item's productId
const getCartProductId = (item) => {
    if (!item || !item.productId) return null;
    if (typeof item.productId === 'string') return item.productId;
    if (item.productId._id) return item.productId._id.toString();
    return item.productId.toString();
};

// Adds product item to user cart (increments quantity if already in cart)
exports.addToCart = catchAsync(async (req, res, next) => {
    const { productId, quantity } = req.body || {};
    const userId = req.user._id;

    if (!productId) {
        return next(new AppError("Product ID is required", 400));
    }

    const addQty = Math.max(1, Number(quantity || 1));

    const product = await Product.findOne({ _id: productId, isDeleted: false, isActive: true });
    if (!product) {
        return next(new AppError("Product not found or is no longer available", 404));
    }

    const user = await User.findById(userId);

    // Find existing item in cart using robust ID comparison
    const cartItemIndex = user.cart.findIndex(item => getCartProductId(item) === productId.toString());

    if (cartItemIndex > -1) {
        const currentQty = user.cart[cartItemIndex].quantity || 0;
        const newTotalQty = currentQty + addQty;

        if (product.stock < newTotalQty) {
            return next(new AppError(`Only ${product.stock} items available in stock. You already have ${currentQty} in cart.`, 400));
        }

        user.cart[cartItemIndex].quantity = newTotalQty;
        user.cart[cartItemIndex].priceAtAddition = product.price;
        user.cart[cartItemIndex].isPriceChanged = false;
    } else {
        if (product.stock < addQty) {
            return next(new AppError(`Only ${product.stock} items available in stock.`, 400));
        }

        user.cart.push({
            productId: product._id,
            quantity: addQty,
            priceAtAddition: product.price,
            isPriceChanged: false
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

// Updates specific item quantity in user cart (Independent product update)
exports.updateCartQuantity = catchAsync(async (req, res, next) => {
    const { productId } = req.params;
    const { quantity } = req.body || {};
    const userId = req.user._id;

    if (!productId) {
        return next(new AppError("Product ID is required", 400));
    }

    const newQty = Number(quantity);
    if (isNaN(newQty) || newQty < 1) {
        return next(new AppError("Quantity must be a positive number greater than 0", 400));
    }

    const product = await Product.findOne({ _id: productId, isDeleted: false, isActive: true });
    if (!product) {
        return next(new AppError("Product not found or unavailable", 404));
    }

    if (product.stock < newQty) {
        return next(new AppError(`Cannot set quantity to ${newQty}. Only ${product.stock} items available in stock.`, 400));
    }

    const user = await User.findById(userId);

    const cartItemIndex = user.cart.findIndex(item => getCartProductId(item) === productId.toString());

    if (cartItemIndex === -1) {
        return next(new AppError("Item not found in your cart", 404));
    }

    user.cart[cartItemIndex].quantity = newQty;
    user.cart[cartItemIndex].priceAtAddition = product.price;
    user.cart[cartItemIndex].isPriceChanged = false;

    await user.save();
    await user.populate("cart.productId");

    res.status(200).json({
        status: "success",
        message: "Cart item quantity updated successfully",
        data: user.cart
    });
});

// Fetches user cart with live price sync & filter of deleted items
exports.getMyCart = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const user = await User.findById(userId).populate("cart.productId");

    let isCartUpdated = false;
    const validCart = [];

    for (const item of user.cart) {
        if (!item.productId || item.productId.isDeleted || !item.productId.isActive) {
            isCartUpdated = true;
            continue; // Exclude deleted/invalid products
        }

        if (item.productId.price !== item.priceAtAddition) {
            item.priceAtAddition = item.productId.price;
            item.isPriceChanged = true;
            isCartUpdated = true;
        }

        validCart.push(item);
    }

    if (isCartUpdated) {
        user.cart = validCart;
        await user.save();
    }

    res.status(200).json({
        status: "success",
        data: user.cart
    });
});

// Removes item from user cart
exports.removeFromCart = catchAsync(async (req, res, next) => {
    const { productId } = req.params;
    const userId = req.user._id;

    const user = await User.findById(userId);

    user.cart = user.cart.filter(item => getCartProductId(item) !== productId.toString());
    
    await user.save();
    await user.populate("cart.productId");

    res.status(200).json({
        status: "success",
        message: "Item removed from cart successfully",
        data: user.cart
    });
});