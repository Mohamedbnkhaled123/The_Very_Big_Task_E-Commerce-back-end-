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

    const user = await User.findById(userId);
    if (!user || user.cart.length === 0) {
        return next(new AppError("Your cart is empty! Cannot place an order.", 400));
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        let totalPrice = 0;
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

            totalPrice += product.price * cartItem.quantity;
            orderItems.push({
                productId: product._id,
                quantity: cartItem.quantity,
                priceAtPurchase: product.price
            });
        }

        const newOrder = await Order.create([{
            user: userId,
            items: orderItems,
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
    const orders = await Order.find({ user: req.user._id }).sort("-createdAt");

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

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const triggerRefund = ["rejected", "cancelledByAdmin", "cancelledByUser"].includes(status);
        const alreadyRefunded = ["rejected", "cancelledByAdmin", "cancelledByUser"].includes(order.orderStatus);

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
    const orders = await Order.find().populate("user", "name email").sort("-createdAt");

    res.status(200).json({
        status: "success",
        results: orders.length,
        data: orders
    });
});