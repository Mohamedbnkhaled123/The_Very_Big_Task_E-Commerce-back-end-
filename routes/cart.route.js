const express = require("express");
const router = express.Router();
const { addToCart, getMyCart, removeFromCart } = require("../controllers/cart.controller");
const { authenticate } = require("../middlewares/auth.middleware");

router.use(authenticate);

router.post("/", addToCart);

router.get("/", getMyCart);

router.delete("/:productId", removeFromCart);

module.exports = router;