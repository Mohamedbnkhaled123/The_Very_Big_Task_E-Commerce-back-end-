const express = require("express");
const router = express.Router();
const { getPageContent, updatePageContent } = require("../controllers/cms.controller");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");

router.get("/:pageName", getPageContent);

router.post("/update", authenticate, authorize("admin"), updatePageContent);

module.exports = router;