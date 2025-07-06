const express = require('express');
const router = express.Router();
const rentalController = require('../controllers/rentalController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Create new rental
router.post('/', rentalController.createRental);

// Get user rental statistics
router.get('/stats', rentalController.getUserStats);

// Get user rentals
router.get('/', rentalController.getUserRentals);

// Get rental by ID
router.get('/:id', rentalController.getRentalById);

// Cancel rental
router.patch('/:id/cancel', rentalController.cancelRental);

// Complete rental
router.patch('/:id/complete', rentalController.completeRental);

// Complete expired rentals (admin endpoint)
router.post('/complete-expired', rentalController.completeExpiredRentals);

module.exports = router;
