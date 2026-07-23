const express = require("express");
const router = express.Router();
const { createOrder, getMyOrders, updateOrderStatus, getAllOrders } = require("../controllers/order.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

// Authenticates all order routes
router.use(authenticate);

// Admin order routes
router.get("/admin/all", authorize("admin"), getAllOrders);
router.get("/all", authorize("admin"), getAllOrders);

// Order management routes
router.post("/", createOrder);
router.get("/my-orders", getMyOrders);
router.patch("/:id/status", updateOrderStatus);

module.exports = router;