const { VehicleUnit, Vehicle } = require('../models');
const { Op } = require('sequelize');

// Get all vehicle units
exports.getAllVehicleUnits = async (req, res) => {
  try {
    const { vehicle_id, status } = req.query;
    
    const where = {};
    if (vehicle_id) where.vehicle_id = vehicle_id;
    if (status) where.status = status;
    
    const units = await VehicleUnit.findAll({
      where,
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'title', 'brand', 'model', 'vehicle_category']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    res.status(200).json({
      success: true,
      data: units
    });
  } catch (error) {
    console.error('Error getting vehicle units:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vehicle units',
      error: error.message
    });
  }
};

// Get vehicle unit by ID
exports.getVehicleUnitById = async (req, res) => {
  try {
    const { id } = req.params;
    const unit = await VehicleUnit.findByPk(id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle'
        }
      ]
    });
    
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle unit not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: unit
    });
  } catch (error) {
    console.error('Error getting vehicle unit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get vehicle unit',
      error: error.message
    });
  }
};

// Get available units for a vehicle
exports.getAvailableUnits = async (req, res) => {
  try {
    const { vehicle_id } = req.params;
    
    const units = await VehicleUnit.findAll({
      where: {
        vehicle_id: vehicle_id,
        status: 'available'
      },
      include: [
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'title', 'brand', 'model']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      data: units
    });
  } catch (error) {
    console.error('Error getting available units:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available units',
      error: error.message
    });
  }
};

// Create new vehicle unit
exports.createVehicleUnit = async (req, res) => {
  try {
    const {
      vehicle_id,
      plate_number,
      status = 'available',
      current_location,
      current_latitude,
      current_longitude,
      mileage = 0,
      notes
    } = req.body;

    // Validate required fields
    if (!vehicle_id || !plate_number) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle ID and plate number are required'
      });
    }

    // Check if vehicle exists
    const vehicle = await Vehicle.findByPk(vehicle_id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if plate number already exists
    const existingUnit = await VehicleUnit.findOne({
      where: { plate_number }
    });
    
    if (existingUnit) {
      return res.status(409).json({
        success: false,
        message: 'Plate number already exists'
      });
    }

    const unit = await VehicleUnit.create({
      vehicle_id,
      plate_number,
      status,
      current_location,
      current_latitude,
      current_longitude,
      mileage,
      notes
    });

    // Load unit with vehicle info
    const unitWithVehicle = await VehicleUnit.findByPk(unit.id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle'
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Vehicle unit created successfully',
      data: unitWithVehicle
    });
  } catch (error) {
    console.error('Error creating vehicle unit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle unit',
      error: error.message
    });
  }
};

// Update vehicle unit
exports.updateVehicleUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const unit = await VehicleUnit.findByPk(id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle unit not found'
      });
    }

    // If updating plate number, check for duplicates
    if (updateData.plate_number && updateData.plate_number !== unit.plate_number) {
      const existingUnit = await VehicleUnit.findOne({
        where: { 
          plate_number: updateData.plate_number,
          id: { [Op.ne]: id }
        }
      });
      
      if (existingUnit) {
        return res.status(409).json({
          success: false,
          message: 'Plate number already exists'
        });
      }
    }

    await unit.update(updateData);

    // Load updated unit with vehicle info
    const updatedUnit = await VehicleUnit.findByPk(id, {
      include: [
        {
          model: Vehicle,
          as: 'vehicle'
        }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'Vehicle unit updated successfully',
      data: updatedUnit
    });
  } catch (error) {
    console.error('Error updating vehicle unit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vehicle unit',
      error: error.message
    });
  }
};

// Delete vehicle unit
exports.deleteVehicleUnit = async (req, res) => {
  try {
    const { id } = req.params;

    const unit = await VehicleUnit.findByPk(id);
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle unit not found'
      });
    }

    // Check if unit has active rentals
    const { Rental } = require('../models');
    const activeRentals = await Rental.findAll({
      where: {
        unit_id: id,
        status: {
          [Op.in]: ['pending', 'confirmed', 'approved', 'active']
        }
      }
    });

    if (activeRentals.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete vehicle unit with active rentals'
      });
    }

    await unit.destroy();

    res.status(200).json({
      success: true,
      message: 'Vehicle unit deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vehicle unit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vehicle unit',
      error: error.message
    });
  }
};
