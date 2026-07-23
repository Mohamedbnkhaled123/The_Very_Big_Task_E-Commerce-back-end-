const Review = require("../models/review.model");
const Order = require("../models/order.model");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

// Add Review (Only allowed if user has a received order)
exports.addReview = catchAsync(async (req, res, next) => {
    const { productId, text, rating } = req.body;
    const userId = req.user._id;

    if (!text || !rating) {
        return next(new AppError("Please provide both review text and a rating.", 400));
    }

    //  Condition: User must have purchased and received an order with status 'received'
    const query = {
        user: userId,
        orderStatus: "received"
    };

    if (productId) {
        query["items.productId"] = productId;
    }

    const hasReceivedOrder = await Order.findOne(query);

    if (!hasReceivedOrder) {
        return next(new AppError(
            "You can only submit a review after purchasing and receiving the product (order status must be received).",
            403
        ));
    }

    const newReview = await Review.create({
        userId,
        productId: productId || undefined,
        text,
        rating
    });

    res.status(201).json({
        status: "success",
        message: "Review submitted successfully! Pending admin approval.",
        data: newReview
    });
});

// get all reviews (admin)
exports.getAllReviews = catchAsync(async (req, res, next) => {
    const reviews = await Review.find().populate("userId", "name").populate("productId", "name").sort({ createdAt: -1 });

    res.status(200).json({
        status: "success",
        results: reviews.length,
        data: reviews
    });
});

// get approved testimonials
exports.getApprovedTestimonials = catchAsync(async (req, res, next) => {
    const testimonials = await Review.find({ status: "Approved" }).populate("userId", "name");

    res.status(200).json({
        status: "success",
        results: testimonials.length,
        data: testimonials
    });
});

// update review status
exports.updateReviewStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body; // Accepts enum: ['Pending', 'Approved', 'Cancelled']

    const review = await Review.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
    );

    if (!review) {
        return next(new AppError("Review not found", 404));
    }

    res.status(200).json({
        status: "success",
        message: `Review status updated to ${status}`,
        data: review
    });
});