const express = require("express");
const router = express.Router();
const productController = require("../controllers/product.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");


// public routes

router.get("/", productController.getProduct);


router.get("/paginate", productController.paginateProducts);


router.get("/:slug", productController.getProductBySlug);

router.get("/id/:id", productController.getProductById);

router.get("/related/:slug", productController.getRelatedProducts);

 // admin routes

router.post("/", authenticate, authorize("admin"), upload.single("img"), productController.addProduct);


router.patch("/:id", authenticate, authorize("admin"), upload.single("img"), productController.updateProduct);

//  Soft Delete
router.delete("/:id", authenticate, authorize("admin"), productController.deleteProduct);

// Restore Product
router.patch("/:id/restore", authenticate, authorize("admin"), productController.restoreProduct);


router.patch("/:id/toggle-status", authenticate, authorize("admin"), productController.toggleProductStatus);

module.exports = router;