const { User } = require('../models');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const { Op } = require('sequelize');

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, phone_number, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phone_number,
      role,
      is_verified: false,
      last_login: null,
      profile_picture: null
    });

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during registration',
      error: error.message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await user.checkPassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate token
    const token = generateToken(user);

    // Remove password from response
    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during login',
      error: error.message
    });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile',
      error: error.message
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, phone_number } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user
    await user.update({
      name: name || user.name,
      phone_number: phone_number || user.phone_number,
      profile_picture: req.file ? req.file.filename : user.profile_picture
    });

    // Remove password from response
    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
    });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Verify current password
    const isPasswordValid = await user.checkPassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Current password is incorrect'
      });
    }

    // Update password
    await user.update({
      password: newPassword
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      error: error.message
    });
  }
};

// Get all users (Admin only)
exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { 
                exclude: ['password'] // Exclude password from response
            },
            order: [['createdAt', 'DESC']]
        });

        res.status(200).json({
            status: 'success',
            message: 'Users retrieved successfully',
            data: users.map(user => ({
                ...user.toJSON(),
                role: user.role.charAt(0).toUpperCase() + user.role.slice(1) // Capitalize role
            }))
        });
    } catch (error) {
        console.error('Error getting users:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve users',
            error: error.message
        });
    }
};

// Get user by ID (Admin only)
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'User retrieved successfully',
            data: {
                ...user.toJSON(),
                role: user.role.charAt(0).toUpperCase() + user.role.slice(1)
            }
        });
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve user',
            error: error.message
        });
    }
};

// Update user (Admin only)
exports.updateUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        // Remove password from update if it's empty
        if (req.body.password === '') {
            delete req.body.password;
        }

        await user.update(req.body);

        // Get updated user without password
        const updatedUser = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password'] }
        });

        res.status(200).json({
            status: 'success',
            message: 'User updated successfully',
            data: {
                ...updatedUser.toJSON(),
                role: updatedUser.role.charAt(0).toUpperCase() + updatedUser.role.slice(1)
            }
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update user',
            error: error.message
        });
    }
};

// Delete user (Admin only)
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        await user.destroy();

        res.status(200).json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete user',
            error: error.message
        });
    }
};

// Create user (Admin only)
exports.createUser = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                status: 'error',
                message: 'Validation failed',
                errors: errors.array() 
            });
        }

        const { name, email, password, phone_number, role = 'user', is_verified = false } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({
                status: 'error',
                message: 'Email already registered'
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone_number,
            role,
            is_verified,
            last_login: null,
            profile_picture: null
        });

        // Remove password from response
        const userResponse = { ...user.toJSON() };
        delete userResponse.password;

        res.status(201).json({
            status: 'success',
            message: 'User created successfully',
            data: {
                ...userResponse,
                role: userResponse.role.charAt(0).toUpperCase() + userResponse.role.slice(1)
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error creating user',
            error: error.message
        });
    }
};

// Delete current user profile
exports.deleteCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete the user
    await user.destroy();

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account',
      error: error.message
    });
  }
};