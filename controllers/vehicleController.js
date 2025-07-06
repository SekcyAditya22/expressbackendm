const { Vehicle, VehicleUnit, Rental, sequelize } = require('../models');
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');

// Get all vehicles
exports.getAllVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({
      include: [
        {
          model: VehicleUnit,
          as: 'units',
          attributes: ['id', 'plate_number', 'status', 'current_location']
        }
      ]
    });
    res.status(200).json({
      status: 'success',
      data: vehicles
    });
  } catch (error) {
    console.error('Error getting vehicles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get vehicles',
      error: error.message
    });
  }
};

// Get vehicle by ID
exports.getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findByPk(id, {
      include: [
        {
          model: VehicleUnit,
          as: 'units',
          attributes: ['id', 'plate_number', 'status', 'current_location', 'mileage']
        }
      ]
    });

    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }

    res.status(200).json({
      status: 'success',
      data: vehicle
    });
  } catch (error) {
    console.error('Error getting vehicle:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get vehicle',
      error: error.message
    });
  }
};

// Create new vehicle
exports.createVehicle = async (req, res) => {
  try {
    const {
      title,
      brand,
      model,
      vehicle_category,
      year,
      price_per_day,
      description,
      status,
      transmission,
      fuel_type,
      passenger_capacity,
      features,
      // Vehicle units data
      units // Array of unit objects with plate_number, current_location, etc.
    } = req.body;

    // Handle photos
    let photos = [];
    if (req.files && req.files.length > 0) {
      photos = req.files.map(file => `/uploads/vehicles/${file.filename}`);
    }

    // Parse units data if it's a string
    let unitsData = [];
    if (units) {
      try {
        unitsData = typeof units === 'string' ? JSON.parse(units) : units;
      } catch (error) {
        console.error('Error parsing units data:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid units data format'
        });
      }
    }

    // Validate that at least one unit is provided
    if (!unitsData || unitsData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one vehicle unit must be provided'
      });
    }

    // Parse features data safely
    let featuresArray = [];
    if (features) {
      try {
        if (typeof features === 'string') {
          // If it's a comma-separated string, split it
          if (features.includes(',')) {
            featuresArray = features.split(',').map(f => f.trim()).filter(f => f.length > 0);
          } else {
            // Try to parse as JSON first
            try {
              featuresArray = JSON.parse(features);
            } catch {
              // If JSON parse fails, treat as single feature
              featuresArray = [features.trim()];
            }
          }
        } else if (Array.isArray(features)) {
          featuresArray = features;
        }
      } catch (error) {
        console.error('Error parsing features data:', error);
        featuresArray = [];
      }
    }

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Create vehicle
      const vehicle = await Vehicle.create({
        title,
        brand,
        model,
        vehicle_category,
        year,
        price_per_day,
        description,
        status: status || 'available',
        photos,
        features: featuresArray,
        transmission,
        fuel_type,
        passenger_capacity
      }, { transaction });

      // Create vehicle units
      const vehicleUnits = [];
      for (const unitData of unitsData) {
        const unit = await VehicleUnit.create({
          vehicle_id: vehicle.id,
          plate_number: unitData.plate_number,
          status: unitData.status || 'available',
          current_location: unitData.current_location || null,
          current_latitude: unitData.current_latitude || null,
          current_longitude: unitData.current_longitude || null,
          mileage: unitData.mileage || 0,
          notes: unitData.notes || null
        }, { transaction });

        vehicleUnits.push(unit);
      }

      // Commit transaction
      await transaction.commit();

      // Load vehicle with units for response
      const vehicleWithUnits = await Vehicle.findByPk(vehicle.id, {
        include: [
          {
            model: VehicleUnit,
            as: 'units'
          }
        ]
      });
    
      res.status(201).json({
        success: true,
        message: 'Vehicle and units created successfully',
        data: vehicleWithUnits
      });

    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error creating vehicle:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vehicle',
      error: error.message
    });
  }
};

// Update vehicle
exports.updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('Update vehicle request for ID:', id);
    console.log('Update vehicle request body:', req.body);
    console.log('Update vehicle files:', req.files);
    
    // Find vehicle
    const vehicle = await Vehicle.findByPk(id);
    
    if (!vehicle) {
      console.log('Vehicle not found with ID:', id);
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }
    
    console.log('Original vehicle data:', vehicle.toJSON());
    
    // Create update object from request body
    const updateData = {};
    let hasUpdates = false;
    
    // Process each field from the request body
    Object.keys(req.body).forEach(key => {
      // Skip empty strings, "null" strings, and undefined values
      if (req.body[key] === undefined || req.body[key] === null || req.body[key] === 'null') {
        console.log(`Skipping field ${key} with value:`, req.body[key]);
        return;
      }
      
      // Add the field to the update data
      updateData[key] = req.body[key];
      console.log(`Adding field ${key} with value:`, req.body[key]);
      hasUpdates = true;
    });
    
    // Handle special fields that need type conversion
    if (updateData.year) {
      updateData.year = parseInt(updateData.year, 10);
    }
    
    if (updateData.price_per_day) {
      updateData.price_per_day = parseFloat(updateData.price_per_day);
    }
    
    if (updateData.unit) {
      updateData.unit = parseInt(updateData.unit, 10);
    }
    
    if (updateData.passenger_capacity) {
      updateData.passenger_capacity = parseInt(updateData.passenger_capacity, 10);
    }
    
    // Handle features - parse if it's a string
    if (updateData.features) {
      if (typeof updateData.features === 'string') {
        try {
          updateData.features = JSON.parse(updateData.features);
          console.log('Parsed features:', updateData.features);
        } catch (e) {
          // If not valid JSON, treat as a comma-separated list
          updateData.features = updateData.features.split(',').map(item => item.trim());
          console.log('Converted features to array:', updateData.features);
        }
      }
    }
    
    // Handle photos - append new photos if they exist
    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map(file => `/uploads/vehicles/${file.filename}`);
      console.log('New photos:', newPhotos);
      
      // Check if we should replace photos instead of appending
      const shouldReplacePhotos = req.body.replace_photos === 'true';
      console.log('Replace photos flag:', shouldReplacePhotos);
      
      if (shouldReplacePhotos) {
        // Delete old photos from storage if they exist
        if (vehicle.photos) {
          let oldPhotos;
          
          // Parse existing photos if they're stored as a string
          if (typeof vehicle.photos === 'string') {
            try {
              oldPhotos = JSON.parse(vehicle.photos);
            } catch (e) {
              oldPhotos = [];
            }
          } else if (Array.isArray(vehicle.photos)) {
            oldPhotos = vehicle.photos;
          } else {
            oldPhotos = [];
          }
          
          // Delete each old photo
          oldPhotos.forEach(photo => {
            try {
              const photoPath = path.join(__dirname, '..', photo);
              if (fs.existsSync(photoPath)) {
                fs.unlinkSync(photoPath);
                console.log(`Deleted old photo: ${photoPath}`);
              }
            } catch (err) {
              console.error(`Failed to delete old photo: ${err.message}`);
            }
          });
        }
        
        // Replace existing photos with new ones
        updateData.photos = newPhotos;
        console.log('Replacing photos with:', updateData.photos);
      } else {
        // Append new photos to existing ones
        let existingPhotos = vehicle.photos;
        // Parse existing photos if they're stored as a string
        if (typeof existingPhotos === 'string') {
          try {
            existingPhotos = JSON.parse(existingPhotos);
          } catch (e) {
            existingPhotos = [];
          }
        }
        
        // Ensure existingPhotos is an array
        if (!Array.isArray(existingPhotos)) {
          existingPhotos = [];
        }
        
        // Combine existing and new photos
        updateData.photos = [...existingPhotos, ...newPhotos];
        console.log('Combined photos:', updateData.photos);
      }
      
      hasUpdates = true;
    }
    
    console.log('Final update data:', updateData);
    
    // Check if there are any fields to update
    if (!hasUpdates || Object.keys(updateData).length === 0) {
      console.log('No fields to update');
      return res.status(400).json({
        status: 'error',
        message: 'No valid fields to update'
      });
    }
    
    // Update vehicle
    try {
      await vehicle.update(updateData);
      console.log('Vehicle updated successfully');
      
      // Get the updated vehicle
      const updatedVehicle = await Vehicle.findByPk(id);
      console.log('Updated vehicle data:', updatedVehicle.toJSON());
      
      return res.status(200).json({
        status: 'success',
        message: 'Vehicle updated successfully',
        data: updatedVehicle
      });
    } catch (updateError) {
      console.error('Error updating vehicle:', updateError);
      
      // Try with direct SQL update as a fallback
      try {
        const [updatedRows] = await Vehicle.update(updateData, {
          where: { id }
        });
        
        if (updatedRows === 0) {
          console.log('No rows updated with static method');
          return res.status(404).json({
            status: 'error',
            message: 'Vehicle not found or no changes made'
          });
        }
        
        // Get the updated vehicle
        const updatedVehicle = await Vehicle.findByPk(id);
        console.log('Updated vehicle data (static method):', updatedVehicle.toJSON());
        
        return res.status(200).json({
          status: 'success',
          message: 'Vehicle updated successfully',
          data: updatedVehicle
        });
      } catch (staticUpdateError) {
        console.error('Error with static update method:', staticUpdateError);
        throw staticUpdateError;
      }
    }
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to update vehicle',
      error: error.message
    });
  }
};

// Delete vehicle
exports.deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const vehicle = await Vehicle.findByPk(id);
    
    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }
    
    // Delete vehicle photos from storage
    if (vehicle.photos) {
      let photosArray;
      
      // Check if photos is a string representation of an array
      if (typeof vehicle.photos === 'string') {
        try {
          photosArray = JSON.parse(vehicle.photos);
        } catch (e) {
          photosArray = [];
        }
      } else if (Array.isArray(vehicle.photos)) {
        photosArray = vehicle.photos;
      } else {
        photosArray = [];
      }
      
      // Delete each photo
      photosArray.forEach(photo => {
        const photoPath = path.join(__dirname, '..', photo);
        if (fs.existsSync(photoPath)) {
          fs.unlinkSync(photoPath);
        }
      });
    }
    
    // Delete vehicle from database
    await vehicle.destroy();
    
    res.status(200).json({
      status: 'success',
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete vehicle',
      error: error.message
    });
  }
};

// Get vehicles by category
exports.getVehiclesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const vehicles = await Vehicle.findAll({
      where: { vehicle_category: category }
    });
    
    res.status(200).json({
      status: 'success',
      data: vehicles
    });
  } catch (error) {
    console.error('Error getting vehicles by category:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get vehicles by category',
      error: error.message
    });
  }
};

// Get available vehicles
exports.getAvailableVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.findAll({
      where: { status: 'available' }
    });
    
    res.status(200).json({
      status: 'success',
      data: vehicles
    });
  } catch (error) {
    console.error('Error getting available vehicles:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get available vehicles',
      error: error.message
    });
  }
};

// Check vehicle availability for specific dates
exports.checkVehicleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        status: 'error',
        message: 'Start date and end date are required'
      });
    }

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }

    // Count overlapping active rentals
    const overlappingRentals = await Rental.count({
      where: {
        vehicle_id: id,
        status: ['pending', 'confirmed', 'active'],
        [Op.or]: [
          {
            start_date: {
              [Op.between]: [start_date, end_date]
            }
          },
          {
            end_date: {
              [Op.between]: [start_date, end_date]
            }
          },
          {
            [Op.and]: [
              { start_date: { [Op.lte]: start_date } },
              { end_date: { [Op.gte]: end_date } }
            ]
          }
        ]
      }
    });

    const availableUnits = Math.max(0, vehicle.unit - overlappingRentals);
    const isAvailable = availableUnits > 0 && vehicle.status === 'available';

    res.status(200).json({
      status: 'success',
      data: {
        vehicle_id: vehicle.id,
        total_units: vehicle.unit,
        available_units: availableUnits,
        is_available: isAvailable,
        vehicle_status: vehicle.status,
        overlapping_rentals: overlappingRentals
      }
    });

  } catch (error) {
    console.error('Error checking vehicle availability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check vehicle availability',
      error: error.message
    });
  }
};

// Get vehicles with real-time availability
exports.getVehiclesWithAvailability = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    // Get all vehicles with their units
    const vehicles = await Vehicle.findAll({
      include: [
        {
          model: VehicleUnit,
          as: 'units',
          attributes: ['id', 'plate_number', 'status', 'current_location', 'mileage']
        }
      ]
    });

    // If dates are provided, calculate availability for each vehicle based on unit rentals
    if (start_date && end_date) {
      const vehiclesWithAvailability = await Promise.all(
        vehicles.map(async (vehicle) => {
          // Count overlapping rentals for this vehicle's units
          const overlappingRentals = await Rental.count({
            where: {
              [Op.or]: [
                // Legacy rentals using vehicle_id
                {
                  vehicle_id: vehicle.id,
                  status: ['pending', 'confirmed', 'active'],
                  [Op.or]: [
                    {
                      start_date: {
                        [Op.between]: [start_date, end_date]
                      }
                    },
                    {
                      end_date: {
                        [Op.between]: [start_date, end_date]
                      }
                    },
                    {
                      [Op.and]: [
                        { start_date: { [Op.lte]: start_date } },
                        { end_date: { [Op.gte]: end_date } }
                      ]
                    }
                  ]
                },
                // New rentals using unit_id
                {
                  unit_id: {
                    [Op.in]: vehicle.units.map(unit => unit.id)
                  },
                  status: ['pending', 'confirmed', 'active'],
                  [Op.or]: [
                    {
                      start_date: {
                        [Op.between]: [start_date, end_date]
                      }
                    },
                    {
                      end_date: {
                        [Op.between]: [start_date, end_date]
                      }
                    },
                    {
                      [Op.and]: [
                        { start_date: { [Op.lte]: start_date } },
                        { end_date: { [Op.gte]: end_date } }
                      ]
                    }
                  ]
                }
              ]
            }
          });

          // Calculate available units based on actual units and their status
          const totalUnits = vehicle.units.length;
          const availableUnitsFromStatus = vehicle.units.filter(unit => unit.status === 'available').length;
          const availableUnits = Math.max(0, availableUnitsFromStatus - overlappingRentals);
          const isAvailable = availableUnits > 0;

          return {
            ...vehicle.toJSON(),
            available_units: availableUnits,
            is_available: isAvailable,
            overlapping_rentals: overlappingRentals
          };
        })
      );

      return res.status(200).json({
        status: 'success',
        data: vehiclesWithAvailability
      });
    }

    // If no dates provided, return vehicles with basic availability based on units
    const vehiclesWithBasicAvailability = vehicles.map(vehicle => {
      const totalUnits = vehicle.units.length;
      const availableUnits = vehicle.units.filter(unit => unit.status === 'available').length;
      const isAvailable = availableUnits > 0;

      return {
        ...vehicle.toJSON(),
        available_units: availableUnits,
        is_available: isAvailable
      };
    });

    res.status(200).json({
      status: 'success',
      data: vehiclesWithBasicAvailability
    });

  } catch (error) {
    console.error('Error getting vehicles with availability:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get vehicles with availability',
      error: error.message
    });
  }
};

// Admin endpoint to update vehicle units
exports.updateVehicleUnits = async (req, res) => {
  try {
    const { id } = req.params;
    const { unit } = req.body;

    if (!unit || unit < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Valid unit count is required'
      });
    }

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      return res.status(404).json({
        status: 'error',
        message: 'Vehicle not found'
      });
    }

    // Update vehicle units and status
    const newStatus = unit > 0 ? 'available' : 'rented';

    await vehicle.update({
      unit: unit,
      status: newStatus
    });

    res.status(200).json({
      status: 'success',
      message: 'Vehicle units updated successfully',
      data: vehicle
    });

  } catch (error) {
    console.error('Error updating vehicle units:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update vehicle units',
      error: error.message
    });
  }
};