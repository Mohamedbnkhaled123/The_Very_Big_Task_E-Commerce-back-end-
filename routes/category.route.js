const express = require("express");
const router = express.Router();
const { getCategories, addCategory, updateCategory, deleteCategory } = require("../controllers/category.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");


router.get("/", getCategories);


router.post("/", authenticate, authorize("admin"), upload.single("img"), addCategory);

router.patch("/:id", authenticate, authorize("admin"), upload.single("img"), updateCategory);
router.delete("/:id", authenticate, authorize("admin"), deleteCategory);

module.exports = router;