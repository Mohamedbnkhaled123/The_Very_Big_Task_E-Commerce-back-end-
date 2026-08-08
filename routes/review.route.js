const express = require("express");
const router = express.Router();
const {
    addReview,
    getProductReviews,
    getAllReviews,
    updateReviewStatus,
    deleteReview
} = require("../controllers/review.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

// Public Endpoint: Fetch approved product-level reviews & rating stats
router.get("/product/:productId", getProductReviews);

// Authenticated User Endpoint: Submit verified product review
router.post("/", authenticate, authorize("user"), addReview);

// Admin Moderation Endpoints
router.get("/", authenticate, authorize("admin"), getAllReviews);
router.patch("/:id/status", authenticate, authorize("admin"), updateReviewStatus);
router.delete("/:id", authenticate, authorize("admin"), deleteReview);

module.exports = router;