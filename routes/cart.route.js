const express = require("express");
const router = express.Router();
const { addToCart, getMyCart, updateCartQuantity, removeFromCart } = require("../controllers/cart.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.post("/", addToCart);
router.get("/", getMyCart);
router.patch("/:productId", updateCartQuantity);
router.delete("/:productId", removeFromCart);

module.exports = router;