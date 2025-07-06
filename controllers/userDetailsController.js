const { User, UserDetails } = require('../models');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = file.fieldname === 'ktp_photo' ? 'uploads/ktp/' : 'uploads/sim/';
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const prefix = file.fieldname === 'ktp_photo' ? 'ktp' : 'sim';
        cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Get user details
exports.getUserDetails = async (req, res) => {
    try {
        const userId = req.user.id;
        
        let userDetails = await UserDetails.findOne({
            where: { user_id: userId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: User,
                    as: 'verifiedBy',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });

        // If no details exist, create empty record
        if (!userDetails) {
            userDetails = await UserDetails.create({
                user_id: userId
            });
            
            // Fetch the created record with associations
            userDetails = await UserDetails.findOne({
                where: { user_id: userId },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    }
                ]
            });
        }

        res.json({
            status: 'success',
            message: 'User details retrieved successfully',
            data: userDetails
        });
    } catch (error) {
        console.error('Get user details error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user details',
            error: error.message
        });
    }
};

// Update user details
exports.updateUserDetails = async (req, res) => {
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
        const {
            ktp_number,
            sim_number,
            address,
            date_of_birth,
            place_of_birth,
            gender,
            emergency_contact_name,
            emergency_contact_phone,
            emergency_contact_relation
        } = req.body;

        // Sanitize input data by trimming whitespace
        const sanitizedData = {
            ktp_number: ktp_number?.trim(),
            sim_number: sim_number?.trim(),
            address: address?.trim(),
            date_of_birth: date_of_birth?.trim(),
            place_of_birth: place_of_birth?.trim(),
            gender: gender?.trim(),
            emergency_contact_name: emergency_contact_name?.trim(),
            emergency_contact_phone: emergency_contact_phone?.trim(),
            emergency_contact_relation: emergency_contact_relation?.trim()
        };

        // Check if KTP number already exists for another user
        if (ktp_number) {
            const existingKtp = await UserDetails.findOne({
                where: { 
                    ktp_number: ktp_number,
                    user_id: { [require('sequelize').Op.ne]: userId }
                }
            });
            
            if (existingKtp) {
                return res.status(400).json({
                    status: 'error',
                    message: 'KTP number already exists'
                });
            }
        }

        // Check if SIM number already exists for another user
        if (sim_number) {
            const existingSim = await UserDetails.findOne({
                where: { 
                    sim_number: sim_number,
                    user_id: { [require('sequelize').Op.ne]: userId }
                }
            });
            
            if (existingSim) {
                return res.status(400).json({
                    status: 'error',
                    message: 'SIM number already exists'
                });
            }
        }

        // Find or create user details
        let [userDetails, created] = await UserDetails.findOrCreate({
            where: { user_id: userId },
            defaults: {
                user_id: userId,
                ktp_number,
                sim_number,
                address,
                date_of_birth,
                place_of_birth,
                gender,
                emergency_contact_name,
                emergency_contact_phone,
                emergency_contact_relation
            }
        });

        // If record exists, update it
        if (!created) {
            await userDetails.update(sanitizedData);
        }

        // Fetch updated record with associations
        userDetails = await UserDetails.findOne({
            where: { user_id: userId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email']
                }
            ]
        });

        res.json({
            status: 'success',
            message: 'User details updated successfully',
            data: userDetails
        });
    } catch (error) {
        console.error('Update user details error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update user details',
            error: error.message
        });
    }
};

// Upload KTP photo
exports.uploadKtpPhoto = [
    upload.single('ktp_photo'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No file uploaded'
                });
            }

            const userId = req.user.id;
            const ktpPhotoPath = `/${req.file.path.replace(/\\/g, '/')}`;

            // Find or create user details
            let [userDetails] = await UserDetails.findOrCreate({
                where: { user_id: userId },
                defaults: {
                    user_id: userId,
                    ktp_photo: ktpPhotoPath
                }
            });

            // Update KTP photo path
            await userDetails.update({
                ktp_photo: ktpPhotoPath,
                is_ktp_verified: false // Reset verification status
            });

            res.json({
                status: 'success',
                message: 'KTP photo uploaded successfully',
                data: {
                    ktp_photo: ktpPhotoPath
                }
            });
        } catch (error) {
            console.error('Upload KTP photo error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to upload KTP photo',
                error: error.message
            });
        }
    }
];

// Upload SIM photo
exports.uploadSimPhoto = [
    upload.single('sim_photo'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    status: 'error',
                    message: 'No file uploaded'
                });
            }

            const userId = req.user.id;
            const simPhotoPath = `/${req.file.path.replace(/\\/g, '/')}`;

            // Find or create user details
            let [userDetails] = await UserDetails.findOrCreate({
                where: { user_id: userId },
                defaults: {
                    user_id: userId,
                    sim_photo: simPhotoPath
                }
            });

            // Update SIM photo path
            await userDetails.update({
                sim_photo: simPhotoPath,
                is_sim_verified: false // Reset verification status
            });

            res.json({
                status: 'success',
                message: 'SIM photo uploaded successfully',
                data: {
                    sim_photo: simPhotoPath
                }
            });
        } catch (error) {
            console.error('Upload SIM photo error:', error);
            res.status(500).json({
                status: 'error',
                message: 'Failed to upload SIM photo',
                error: error.message
            });
        }
    }
];
