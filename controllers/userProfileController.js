const { User } = require('../models');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for profile picture upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/profiles';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
        }
    }
});

// Get current user profile
exports.getCurrentUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'phone_number', 'profile_picture', 'is_verified', 'role', 'createdAt']
        });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.json({
            status: 'success',
            message: 'User profile retrieved successfully',
            data: user
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user profile',
            error: error.message
        });
    }
};

// Update user profile (name and phone)
exports.updateUserProfile = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userId = req.user.id;
        const { name, phone_number } = req.body;

        // Sanitize input data
        const sanitizedData = {
            name: name?.trim(),
            phone_number: phone_number?.trim()
        };

        // Check if phone number already exists for another user
        if (sanitizedData.phone_number) {
            const existingUser = await User.findOne({
                where: { 
                    phone_number: sanitizedData.phone_number,
                    id: { [require('sequelize').Op.ne]: userId }
                }
            });
            
            if (existingUser) {
                return res.status(400).json({
                    status: 'error',
                    message: 'Phone number already exists'
                });
            }
        }

        // Update user profile
        await User.update(sanitizedData, {
            where: { id: userId }
        });

        // Fetch updated user data
        const updatedUser = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'phone_number', 'profile_picture', 'is_verified', 'role', 'createdAt']
        });

        res.json({
            status: 'success',
            message: 'User profile updated successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Update user profile error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update user profile',
            error: error.message
        });
    }
};

// Upload profile picture
exports.uploadProfilePicture = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) {
            return res.status(400).json({
                status: 'error',
                message: 'No profile picture file uploaded'
            });
        }

        const profilePicturePath = `/uploads/profiles/${req.file.filename}`;

        // Get current user to check for existing profile picture
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Delete old profile picture if exists
        if (user.profile_picture) {
            const oldPicturePath = path.join(__dirname, '..', user.profile_picture);
            if (fs.existsSync(oldPicturePath)) {
                fs.unlinkSync(oldPicturePath);
            }
        }

        // Update profile picture path
        await user.update({
            profile_picture: profilePicturePath
        });

        // Fetch updated user data
        const updatedUser = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'phone_number', 'profile_picture', 'is_verified', 'role', 'createdAt']
        });

        res.json({
            status: 'success',
            message: 'Profile picture uploaded successfully',
            data: {
                user: updatedUser,
                profile_picture: profilePicturePath
            }
        });
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to upload profile picture',
            error: error.message
        });
    }
};

// Delete profile picture
exports.deleteProfilePicture = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Delete profile picture file if exists
        if (user.profile_picture) {
            const picturePath = path.join(__dirname, '..', user.profile_picture);
            if (fs.existsSync(picturePath)) {
                fs.unlinkSync(picturePath);
            }
        }

        // Update user to remove profile picture
        await user.update({
            profile_picture: null
        });

        // Fetch updated user data
        const updatedUser = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'phone_number', 'profile_picture', 'is_verified', 'role', 'createdAt']
        });

        res.json({
            status: 'success',
            message: 'Profile picture deleted successfully',
            data: updatedUser
        });
    } catch (error) {
        console.error('Delete profile picture error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete profile picture',
            error: error.message
        });
    }
};

// Export multer upload middleware
exports.uploadMiddleware = upload.single('profile_picture');
