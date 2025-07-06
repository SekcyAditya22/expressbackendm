const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicleController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Configure upload for vehicle photos
const vehicleUpload = upload.uploadFiles('photos', 5); // Allow up to 5 images

// Public routes - Order matters! More specific routes should come before general ones
router.get('/vehicles/available', vehicleController.getAvailableVehicles);
router.get('/vehicles/with-availability', vehicleController.getVehiclesWithAvailability);
router.get('/vehicles/category/:category', vehicleController.getVehiclesByCategory);
router.get('/vehicles/:id/availability', vehicleController.checkVehicleAvailability);
router.get('/vehicles/:id', vehicleController.getVehicleById);
router.get('/vehicles', vehicleController.getAllVehicles);

// Protected routes (admin only)
router.post('/vehicles', auth.authenticateToken, auth.isAdmin, vehicleUpload, vehicleController.createVehicle);
router.put('/vehicles/:id', auth.authenticateToken, auth.isAdmin, vehicleUpload, vehicleController.updateVehicle);
router.patch('/vehicles/:id/units', auth.authenticateToken, auth.isAdmin, vehicleController.updateVehicleUnits);
router.delete('/vehicles/:id', auth.authenticateToken, auth.isAdmin, vehicleController.deleteVehicle);

module.exports = router; 