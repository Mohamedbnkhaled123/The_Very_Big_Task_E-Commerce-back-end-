const express = require('express');
const router = express.Router();
const {
    createCoupon,
    getAllCoupons,
    toggleCouponStatus,
    deleteCoupon,
    validateCoupon
} = require('../controllers/coupon.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

// Public/Authenticated User validation endpoint
router.post('/validate', validateCoupon);

// Admin Coupon Management Endpoints
router.use(authenticate);
router.use(authorize('admin'));

router.get('/', getAllCoupons);
router.post('/', createCoupon);
router.patch('/:id/status', toggleCouponStatus);
router.delete('/:id', deleteCoupon);

module.exports = router;
