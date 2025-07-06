const { User, UserDetails } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// Get all user details for admin review
exports.getAllUserDetails = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const status = req.query.status; // 'verified', 'pending', 'incomplete'
        const search = req.query.search;

        let whereClause = {};
        
        // Filter by verification status
        if (status === 'verified') {
            whereClause.is_ktp_verified = true;
            whereClause.is_sim_verified = true;
        } else if (status === 'pending') {
            whereClause[Op.or] = [
                {
                    ktp_photo: { [Op.ne]: null },
                    is_ktp_verified: false
                },
                {
                    sim_photo: { [Op.ne]: null },
                    is_sim_verified: false
                }
            ];
        } else if (status === 'incomplete') {
            whereClause[Op.or] = [
                { ktp_number: null },
                { ktp_photo: null },
                { sim_number: null },
                { sim_photo: null }
            ];
        }

        const includeClause = [
            {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email', 'phone_number'],
                where: search ? {
                    [Op.or]: [
                        { name: { [Op.like]: `%${search}%` } },
                        { email: { [Op.like]: `%${search}%` } }
                    ]
                } : undefined
            },
            {
                model: User,
                as: 'verifiedBy',
                attributes: ['id', 'name'],
                required: false
            }
        ];

        const { count, rows } = await UserDetails.findAndCountAll({
            where: whereClause,
            include: includeClause,
            limit,
            offset,
            order: [['createdAt', 'DESC']]
        });

        res.json({
            status: 'success',
            message: 'User details retrieved successfully',
            data: {
                userDetails: rows,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalItems: count,
                    itemsPerPage: limit
                }
            }
        });
    } catch (error) {
        console.error('Get all user details error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user details',
            error: error.message
        });
    }
};

// Get specific user details by user ID
exports.getUserDetailsById = async (req, res) => {
    try {
        const userId = req.params.userId;

        const userDetails = await UserDetails.findOne({
            where: { user_id: userId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'phone_number', 'role', 'is_verified']
                },
                {
                    model: User,
                    as: 'verifiedBy',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });

        if (!userDetails) {
            return res.status(404).json({
                status: 'error',
                message: 'User details not found'
            });
        }

        res.json({
            status: 'success',
            message: 'User details retrieved successfully',
            data: userDetails
        });
    } catch (error) {
        console.error('Get user details by ID error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user details',
            error: error.message
        });
    }
};

// Verify KTP document
exports.verifyKtp = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userId = req.params.userId;
        const { is_verified, notes } = req.body;
        const adminId = req.user.id;

        const userDetails = await UserDetails.findOne({
            where: { user_id: userId }
        });

        if (!userDetails) {
            return res.status(404).json({
                status: 'error',
                message: 'User details not found'
            });
        }

        if (!userDetails.ktp_photo) {
            return res.status(400).json({
                status: 'error',
                message: 'KTP photo not uploaded yet'
            });
        }

        await userDetails.update({
            is_ktp_verified: is_verified,
            verification_notes: notes,
            verified_by: adminId,
            verified_at: is_verified ? new Date() : null
        });

        // Auto-verify user account if both KTP and SIM are verified
        if (is_verified && userDetails.is_sim_verified) {
            await User.update(
                { is_verified: true },
                { where: { id: userId } }
            );
        } else if (!is_verified) {
            // Unverify user account if KTP is rejected
            await User.update(
                { is_verified: false },
                { where: { id: userId } }
            );
        }

        // Fetch updated record with associations
        const updatedUserDetails = await UserDetails.findOne({
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

        res.json({
            status: 'success',
            message: `KTP ${is_verified ? 'verified' : 'rejected'} successfully`,
            data: updatedUserDetails
        });
    } catch (error) {
        console.error('Verify KTP error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to verify KTP',
            error: error.message
        });
    }
};

// Verify SIM document
exports.verifySim = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userId = req.params.userId;
        const { is_verified, notes } = req.body;
        const adminId = req.user.id;

        const userDetails = await UserDetails.findOne({
            where: { user_id: userId }
        });

        if (!userDetails) {
            return res.status(404).json({
                status: 'error',
                message: 'User details not found'
            });
        }

        if (!userDetails.sim_photo) {
            return res.status(400).json({
                status: 'error',
                message: 'SIM photo not uploaded yet'
            });
        }

        await userDetails.update({
            is_sim_verified: is_verified,
            verification_notes: notes,
            verified_by: adminId,
            verified_at: is_verified && userDetails.is_ktp_verified ? new Date() : userDetails.verified_at
        });

        // Auto-verify user account if both KTP and SIM are verified
        if (is_verified && userDetails.is_ktp_verified) {
            await User.update(
                { is_verified: true },
                { where: { id: userId } }
            );
        } else if (!is_verified) {
            // Unverify user account if SIM is rejected
            await User.update(
                { is_verified: false },
                { where: { id: userId } }
            );
        }

        // Fetch updated record with associations
        const updatedUserDetails = await UserDetails.findOne({
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

        res.json({
            status: 'success',
            message: `SIM ${is_verified ? 'verified' : 'rejected'} successfully`,
            data: updatedUserDetails
        });
    } catch (error) {
        console.error('Verify SIM error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to verify SIM',
            error: error.message
        });
    }
};

// Bulk verify documents
exports.bulkVerify = async (req, res) => {
    try {
        const { user_ids, action, notes } = req.body; // action: 'approve' or 'reject'
        const adminId = req.user.id;

        if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
            return res.status(400).json({
                status: 'error',
                message: 'User IDs array is required'
            });
        }

        const isVerified = action === 'approve';
        
        await UserDetails.update({
            is_ktp_verified: isVerified,
            is_sim_verified: isVerified,
            verification_notes: notes,
            verified_by: adminId,
            verified_at: isVerified ? new Date() : null
        }, {
            where: {
                user_id: { [Op.in]: user_ids }
            }
        });

        res.json({
            status: 'success',
            message: `${user_ids.length} user documents ${action}d successfully`
        });
    } catch (error) {
        console.error('Bulk verify error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to bulk verify documents',
            error: error.message
        });
    }
};

// Verify user account (update is_verified in users table)
exports.verifyUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                status: 'error',
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const userId = req.params.userId;
        const { is_verified, notes } = req.body;
        const adminId = req.user.id;

        // Find user
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Find user details
        const userDetails = await UserDetails.findOne({
            where: { user_id: userId }
        });

        if (!userDetails) {
            return res.status(404).json({
                status: 'error',
                message: 'User details not found'
            });
        }

        // Check if both KTP and SIM are verified before allowing user verification
        if (is_verified && (!userDetails.is_ktp_verified || !userDetails.is_sim_verified)) {
            return res.status(400).json({
                status: 'error',
                message: 'Both KTP and SIM must be verified before verifying user account'
            });
        }

        // Update user verification status
        await user.update({
            is_verified: is_verified
        });

        // Update user details with verification info
        await userDetails.update({
            verification_notes: notes,
            verified_by: adminId,
            verified_at: is_verified ? new Date() : null
        });

        // Fetch updated record with associations
        const updatedUserDetails = await UserDetails.findOne({
            where: { user_id: userId },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'is_verified']
                },
                {
                    model: User,
                    as: 'verifiedBy',
                    attributes: ['id', 'name'],
                    required: false
                }
            ]
        });

        res.json({
            status: 'success',
            message: `User account ${is_verified ? 'verified' : 'unverified'} successfully`,
            data: updatedUserDetails
        });
    } catch (error) {
        console.error('Verify user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to verify user account',
            error: error.message
        });
    }
};
