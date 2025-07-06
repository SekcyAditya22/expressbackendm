const express = require('express');
const router = express.Router();
const adminRentalController = require('../controllers/adminRentalController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all rentals
router.get('/', adminRentalController.getAllRentals);

// Get pending rentals for approval
router.get('/pending', adminRentalController.getPendingRentals);

// Get rental statistics
router.get('/stats', adminRentalController.getRentalStats);

// Approve rental
router.patch('/:id/approve', adminRentalController.approveRental);

// Reject rental
router.patch('/:id/reject', adminRentalController.rejectRental);

module.exports = router;
