const express = require("express");
const router = express.Router();
const { getSubCategoriesByMain, addSubCategory, deleteSubCategory } = require("../controllers/subCategories.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");


router.get("/main/:categoryId", getSubCategoriesByMain);

router.post("/", authenticate, authorize("admin"), addSubCategory);
router.delete("/:id", authenticate, authorize("admin"), deleteSubCategory);

module.exports = router;