const express = require("express");
const router = express.Router();
const {
    getFinancialAnalytics,
    getProductAnalytics,
    getOrderAudit,
    getReviewAnalytics
} = require("../controllers/analytics.controller");

const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

// Authenticate and restrict all analytics endpoints strictly to Admin users
router.use(authenticate);
router.use(authorize("admin"));

router.get("/financial", getFinancialAnalytics);
router.get("/products", getProductAnalytics);
router.get("/orders", getOrderAudit);
router.get("/reviews", getReviewAnalytics);

module.exports = router;
