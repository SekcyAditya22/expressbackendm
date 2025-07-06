const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const userController = require('../controllers/userController');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Validation rules
const registerValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address with @ symbol')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('phone_number')
    .optional()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage('Please enter a valid phone number')
];

const createUserValidation = [
  body('name')
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('phone_number')
    .optional()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage('Please enter a valid phone number'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  body('is_verified')
    .optional()
    .isBoolean()
    .withMessage('is_verified must be a boolean value')
];

const loginValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const updateProfileValidation = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('phone_number')
    .optional()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage('Please enter a valid phone number')
];

const updateUserValidation = [
  body('name')
    .optional()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters long'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please enter a valid email address')
    .normalizeEmail(),
  body('phone_number')
    .optional()
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage('Please enter a valid phone number'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  body('is_verified')
    .optional()
    .isBoolean()
    .withMessage('is_verified must be a boolean value')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// Public routes
router.post('/register', registerValidation, userController.register);
router.post('/login', loginValidation, userController.login);

// Protected routes
router.get('/profile', authenticateToken, userController.getProfile);
router.put(
  '/profile',
  authenticateToken,
  upload.single('profile_picture'),
  updateProfileValidation,
  userController.updateProfile
);
router.put(
  '/change-password',
  authenticateToken,
  changePasswordValidation,
  userController.changePassword
);
router.delete('/profile', authenticateToken, userController.deleteCurrentUser);

// Admin routes
router.post('/users', authenticateToken, isAdmin, createUserValidation, userController.createUser);
router.get('/users', authenticateToken, isAdmin, userController.getUsers);
router.get('/users/:id', authenticateToken, isAdmin, userController.getUserById);
router.put('/users/:id', authenticateToken, isAdmin, updateUserValidation, userController.updateUser);
router.delete('/users/:id', authenticateToken, isAdmin, userController.deleteUser);

module.exports = router; 