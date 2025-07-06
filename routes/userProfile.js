const express = require('express');
const router = express.Router();
const userProfileController = require('../controllers/userProfileController');
const { authenticateToken } = require('../middleware/auth');
const { updateUserProfileValidation } = require('../middleware/userProfileValidation');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/user-profile - Get current user profile
router.get('/', userProfileController.getCurrentUserProfile);

// PUT /api/user-profile - Update user profile (name and phone)
router.put('/', updateUserProfileValidation, userProfileController.updateUserProfile);

// POST /api/user-profile/upload-picture - Upload profile picture
router.post('/upload-picture', userProfileController.uploadMiddleware, userProfileController.uploadProfilePicture);

// DELETE /api/user-profile/delete-picture - Delete profile picture
router.delete('/delete-picture', userProfileController.deleteProfilePicture);

module.exports = router;
