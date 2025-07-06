const express = require('express');
const router = express.Router();
const adminUserDetailsController = require('../controllers/adminUserDetailsController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');

// Admin authorization middleware
const adminAuth = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({
            status: 'error',
            message: 'Access denied. Admin role required.'
        });
    }
    next();
};

// Apply authentication and admin authorization to all routes
router.use(authenticateToken);
router.use(adminAuth);

// Validation for verification
const verificationValidation = [
    body('is_verified')
        .isBoolean()
        .withMessage('is_verified must be a boolean'),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes must not exceed 500 characters')
];

// Validation for bulk verification
const bulkVerificationValidation = [
    body('user_ids')
        .isArray({ min: 1 })
        .withMessage('user_ids must be a non-empty array'),
    body('user_ids.*')
        .isInt({ min: 1 })
        .withMessage('Each user_id must be a positive integer'),
    body('action')
        .isIn(['approve', 'reject'])
        .withMessage('Action must be either approve or reject'),
    body('notes')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Notes must not exceed 500 characters')
];

// GET /api/admin/user-details - Get all user details with pagination and filters
router.get('/', adminUserDetailsController.getAllUserDetails);

// GET /api/admin/user-details/:userId - Get specific user details
router.get('/:userId', adminUserDetailsController.getUserDetailsById);

// PUT /api/admin/user-details/:userId/verify-ktp - Verify KTP document
router.put('/:userId/verify-ktp', verificationValidation, adminUserDetailsController.verifyKtp);

// PUT /api/admin/user-details/:userId/verify-sim - Verify SIM document
router.put('/:userId/verify-sim', verificationValidation, adminUserDetailsController.verifySim);

// PUT /api/admin/user-details/:userId/verify-user - Verify user account
router.put('/:userId/verify-user', verificationValidation, adminUserDetailsController.verifyUser);

// POST /api/admin/user-details/bulk-verify - Bulk verify documents
router.post('/bulk-verify', bulkVerificationValidation, adminUserDetailsController.bulkVerify);

module.exports = router;
