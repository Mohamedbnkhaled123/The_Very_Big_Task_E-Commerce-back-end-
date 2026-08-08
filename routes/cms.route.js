const express = require("express");
const router = express.Router();
const { getPageContent, updatePageContent, uploadHeroImage } = require("../controllers/cms.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");

router.get("/:pageName", getPageContent);

router.post("/update", authenticate, authorize("admin", "superadmin"), updatePageContent);

router.post("/upload-hero", authenticate, authorize("admin", "superadmin"), upload.single("heroImage"), uploadHeroImage);

module.exports = router;