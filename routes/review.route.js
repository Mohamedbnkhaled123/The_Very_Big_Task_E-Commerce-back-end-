const express = require("express");
const router = express.Router();
const { addReview, getAllReviews, getApprovedTestimonials, updateReviewStatus } = require("../controllers/review.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.get("/testimonials", getApprovedTestimonials);
router.get("/", authenticate, authorize("admin"), getAllReviews);

router.post("/", authenticate, authorize("user"), addReview);
router.patch("/:id/status", authenticate, authorize("admin"), updateReviewStatus);

module.exports = router;