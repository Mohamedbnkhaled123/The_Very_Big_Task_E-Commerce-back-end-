const jwt = require("jsonwebtoken");
const Review = require("../models/review.model");
const Order = require("../models/order.model");
const Product = require("../models/product.model");
const AppError = require("../utilities/appError.utility.js");
const catchAsync = require("../utilities/catchAsync.utility.js");

// Optional Auth Helper to extract user ID if token is provided in request headers
const getOptionalUserId = (req) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const decoded = jwt.verify(token, process.env.SECRET_KEY);
            return decoded ? decoded.id : null;
        }
    } catch (e) {
        return null;
    }
    return null;
};

// Add Verified Product Review (Only allowed if user has received an order containing the product)
exports.addReview = catchAsync(async (req, res, next) => {
    const { productId, text, rating, orderId } = req.body || {};
    const userId = req.user._id;

    if (!productId) {
        return next(new AppError("Product ID is required for submitting a product review.", 400));
    }

    if (!rating) {
        return next(new AppError("Please provide a rating (1 to 5 stars).", 400));
    }

    // 1. Verify User Purchase: Check for a received order containing this product
    const orderQuery = {
        user: userId,
        orderStatus: "received",
        "items.productId": productId
    };

    const hasReceivedOrder = await Order.findOne(orderQuery);

    if (!hasReceivedOrder) {
        return next(new AppError(
            "You can only review products that you have purchased and received (order status must be 'received').",
            403
        ));
    }

    // 2. Prevent Duplicate Reviews: Check if user already reviewed this product
    const existingReview = await Review.findOne({ userId, productId });
    if (existingReview) {
        return next(new AppError("You have already submitted a review for this product.", 400));
    }

    // 3. Create Review in Pending status
    const newReview = await Review.create({
        userId,
        productId,
        orderId: orderId || hasReceivedOrder._id,
        text: text || "",
        rating: Number(rating),
        status: "Pending"
    });

    res.status(201).json({
        status: "success",
        message: "Thank you! Your product review has been submitted for admin approval.",
        data: newReview
    });
});

// Get Product Reviews: Returns all Approved reviews + Pending reviews authored by the current user
exports.getProductReviews = catchAsync(async (req, res, next) => {
    const { productId } = req.params;
    const currentUserId = getOptionalUserId(req);

    // Build filter: Show all Approved reviews PLUS any Pending review authored by current user
    const filter = {
        productId,
        $or: [
            { status: "Approved" },
            ...(currentUserId ? [{ userId: currentUserId }] : [])
        ]
    };

    const reviews = await Review.find(filter)
        .populate("userId", "name")
        .sort({ createdAt: -1 });

    // Rating breakdown statistics ONLY count Approved reviews
    const approvedReviews = reviews.filter(r => r.status === "Approved");
    const totalApproved = approvedReviews.length;
    let sumRating = 0;
    const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    approvedReviews.forEach(r => {
        sumRating += r.rating;
        const rounded = Math.min(5, Math.max(1, Math.round(r.rating)));
        starCounts[rounded] = (starCounts[rounded] || 0) + 1;
    });

    const averageRating = totalApproved > 0 ? (sumRating / totalApproved).toFixed(1) : "0.0";

    res.status(200).json({
        status: "success",
        results: reviews.length,
        summary: {
            averageRating: Number(averageRating),
            totalReviews: totalApproved,
            starCounts
        },
        data: reviews
    });
});

// Get All Reviews for Admin Moderation (Admin Only)
exports.getAllReviews = catchAsync(async (req, res, next) => {
    const reviews = await Review.find()
        .populate("userId", "name email")
        .populate("productId", "name imgURL slug price")
        .sort({ createdAt: -1 });

    res.status(200).json({
        status: "success",
        results: reviews.length,
        data: reviews
    });
});

// Update Review Status (Admin Only)
exports.updateReviewStatus = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body; // Enum: ['Pending', 'Approved', 'Cancelled']

    if (!["Pending", "Approved", "Cancelled"].includes(status)) {
        return next(new AppError("Invalid review status. Must be Pending, Approved, or Cancelled.", 400));
    }

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
        message: `Review status updated to '${status}' successfully.`,
        data: review
    });
});

// Delete Review Permanently (Admin Only)
exports.deleteReview = catchAsync(async (req, res, next) => {
    const { id } = req.params;

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
        return next(new AppError("Review not found", 404));
    }

    res.status(200).json({
        status: "success",
        message: "Review permanently deleted successfully."
    });
});