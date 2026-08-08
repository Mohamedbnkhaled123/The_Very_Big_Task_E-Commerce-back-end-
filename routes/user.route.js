const express = require("express");
const router = express.Router();
const { 
    createUser, 
    getUsers, 
    toggleUserStatus, 
    checkSuperAdminStatus, 
    setupSuperAdmin, 
    toggleAdminStatus, 
    deleteAdmin 
} = require("../controllers/user.controller.js");
const { authenticate } = require("../middlewares/auth.middleware");
const { authorize, requireSuperAdmin } = require("../middlewares/role.middleware");

// Public endpoints
router.get('/superadmin-status', checkSuperAdminStatus);
router.post('/setup-superadmin', setupSuperAdmin);

// Standard user management endpoints
router.post('/', createUser('user'));
router.post('/admin', authenticate, requireSuperAdmin, createUser('admin'));
router.get('/', authenticate, authorize('admin', 'superadmin'), getUsers);
router.patch('/:id/status', authenticate, authorize('admin', 'superadmin'), toggleUserStatus);

// Super Admin Governance routes
router.patch('/:id/admin-status', authenticate, requireSuperAdmin, toggleAdminStatus);
router.delete('/:id', authenticate, requireSuperAdmin, deleteAdmin);

module.exports = router;

