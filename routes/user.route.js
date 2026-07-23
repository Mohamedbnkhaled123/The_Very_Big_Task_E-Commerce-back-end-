const express = require("express");
const router = express.Router();
const { createUser, getUsers } = require("../controllers/user.controller.js");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize } = require("../middlewares/role.middleware");
router.post('/', createUser('user'));
router.post('/admin', authenticate, authorize('admin'), createUser('admin'));
router.get('/', authenticate, authorize('admin'), getUsers);
module.exports = router
