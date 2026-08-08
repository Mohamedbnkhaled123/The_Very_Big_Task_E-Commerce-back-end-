const mongoose = require("mongoose");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const User = require("../models/user.model");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

// Creates order from user cart
exports.createOrder = catchAsync(async (req, res, next) => {
    const { shippingAddress } = req.body;
    const userId = req.user._id;

    if (req.user.role && req.user.role.toLowerCase() === "admin") {
        return next(new AppError("Admins are not allowed to place orders from this store.", 403));
    }

    if (req.user.canPurchase === false) {
        return next(new AppError("ACCOUNT_PURCHASE_RESTRICTED: Your account is currently restricted from completing purchases.", 403));
    }

    const user = await User.findById(userId);
    if (!user || user.cart.length === 0) {
        return next(new AppError("Your cart is empty! Cannot place an order.", 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let grossTotal = 0;
        let totalDiscount = 0;
        const orderItems = [];

        for (const cartItem of user.cart) {
            const product = await Product.findOne({ 
                _id: cartItem.productId, 
                isDeleted: false, 
                isActive: true 
            }).session(session);

            if (!product) {
                throw new AppError("Product not found or is no longer available.", 404);
            }

            if (product.stock < cartItem.quantity) {
                throw new AppError(`Insufficient stock for product: ${product.name}. Available stock is ${product.stock}`, 400);
            }

            product.stock -= cartItem.quantity;
            await product.save({ session });

            const priceAtPurchase = product.price;
            const discountPercent = product.discount || 0;
            const discountedPrice = Math.round(priceAtPurchase * (1 - discountPercent / 100) * 100) / 100;

            const itemGross = priceAtPurchase * cartItem.quantity;
            const itemDiscount = (priceAtPurchase - discountedPrice) * cartItem.quantity;

            grossTotal += itemGross;
            totalDiscount += itemDiscount;

            orderItems.push({
                productId: product._id,
                quantity: cartItem.quantity,
                priceAtPurchase,
                discountPercent,
                discountedPrice
            });
        }

        // Rule-Based Shipping Fee: Free shipping if discounted subtotal >= EGP 1000, otherwise EGP 50
        const discountedSubtotal = grossTotal - totalDiscount;
        const shippingFee = discountedSubtotal >= 1000 ? 0 : 50;
        const netTotal = discountedSubtotal + shippingFee;
        const totalPrice = netTotal;

        const newOrder = await Order.create([{
            user: userId,
            items: orderItems,
            grossTotal,
            shippingFee,
            totalDiscount,
            netTotal,
            totalPrice,
            shippingAddress
        }], { session });

        user.cart = [];
        await user.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            status: "success",
            message: "Order placed successfully",
            data: newOrder[0]
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
});

// Fetches user order history
exports.getMyOrders = catchAsync(async (req, res, next) => {
    const orders = await Order.find({ user: req.user._id })
        .populate("items.productId", "name imgURL price")
        .sort("-createdAt");

    res.status(200).json({
        status: "success",
        results: orders.length,
        data: orders
    });
});

// Updates order status dynamically
exports.updateOrderStatus = catchAsync(async (req, res, next) => {
    const orderId = req.params.id;
    const { status } = req.body;
    const userId = req.user._id;
    const userRole = req.user.role ? req.user.role.toLowerCase() : "user";

    const order = await Order.findById(orderId);
    if (!order) {
        return next(new AppError("Order not found", 404));
    }

    if (userRole === "user") {
        if (order.user.toString() !== userId.toString()) {
            return next(new AppError("You do not have permission to view this order.", 403));
        }
        if (status !== "cancelledByUser") {
            return next(new AppError("Action denied. You can only cancel your own order.", 400));
        }
        if (order.orderStatus !== "pending" && order.orderStatus !== "prepared") {
            return next(new AppError("Cannot cancel order once it has reached shipped or higher status.", 400));
        }
    }

    // Validation rules for post-delivery returns & refunds
    if (status === "returned" && order.orderStatus !== "received") {
        return next(new AppError("Return can only be initiated for orders with 'received' status.", 400));
    }
    if (status === "refunded" && order.orderStatus !== "returned") {
        return next(new AppError("Refund can only be processed for orders with 'returned' status.", 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const triggerRefund = ["rejected", "cancelledByAdmin", "cancelledByUser", "returned"].includes(status);
        const alreadyRefunded = ["rejected", "cancelledByAdmin", "cancelledByUser", "returned", "refunded"].includes(order.orderStatus);

        if (triggerRefund && !alreadyRefunded) {
            for (const item of order.items) {
                await Product.findByIdAndUpdate(
                    item.productId,
                    { $inc: { stock: item.quantity } },
                    { session }
                );
            }
        }

        order.orderStatus = status;
        await order.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            status: "success",
            message: `Order status changed to '${status}' successfully.`,
            data: order
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        return next(error);
    }
});

// Fetches all store orders
exports.getAllOrders = catchAsync(async (req, res, next) => {
    const orders = await Order.find()
        .populate("user", "name email")
        .populate("items.productId", "name imgURL price")
        .sort("-createdAt");

    res.status(200).json({
        status: "success",
        results: orders.length,
        data: orders
    });
});