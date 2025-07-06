const express = require('express');
const router = express.Router();
const userDetailsController = require('../controllers/userDetailsController');
const { authenticateToken } = require('../middleware/auth');
const {
    updateUserDetailsValidation,
    ktpNumberValidation,
    simNumberValidation,
    emergencyContactValidation,
    completeProfileValidation
} = require('../middleware/userDetailsValidation');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/user-details - Get current user's details
router.get('/', userDetailsController.getUserDetails);

// PUT /api/user-details - Update user details (partial update)
router.put('/', updateUserDetailsValidation, userDetailsController.updateUserDetails);

// POST /api/user-details/complete - Complete profile (all required fields)
router.post('/complete', completeProfileValidation, userDetailsController.updateUserDetails);

// PUT /api/user-details/ktp - Update KTP number only
router.put('/ktp', ktpNumberValidation, userDetailsController.updateUserDetails);

// PUT /api/user-details/sim - Update SIM number only
router.put('/sim', simNumberValidation, userDetailsController.updateUserDetails);

// PUT /api/user-details/emergency-contact - Update emergency contact
router.put('/emergency-contact', emergencyContactValidation, userDetailsController.updateUserDetails);

// POST /api/user-details/upload/ktp - Upload KTP photo
router.post('/upload/ktp', userDetailsController.uploadKtpPhoto);

// POST /api/user-details/upload/sim - Upload SIM photo
router.post('/upload/sim', userDetailsController.uploadSimPhoto);

module.exports = router;
