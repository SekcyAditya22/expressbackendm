const { Rental, Vehicle, VehicleUnit, User, Payment } = require('../models');
const { Op } = require('sequelize');
const midtransService = require('../services/midtransService');

class RentalController {
  // Create new rental
  async createRental(req, res) {
    try {
      const userId = req.user.id;
      let {
        vehicle_id,
        unit_id,
        start_date,
        end_date,
        pickup_location,
        pickup_latitude,
        pickup_longitude,
        return_location,
        return_latitude,
        return_longitude,
        notes
      } = req.body;

      console.log('=== CREATE RENTAL REQUEST ===');
      console.log('User ID:', userId);
      console.log('Vehicle ID:', vehicle_id);
      console.log('Start Date:', start_date);
      console.log('End Date:', end_date);
      console.log('Request Body:', req.body);

      // Validate required fields - prioritize unit_id over vehicle_id
      if (!unit_id && !vehicle_id) {
        return res.status(400).json({
          status: 'error',
          message: 'Either unit ID or vehicle ID is required'
        });
      }

      if (!start_date || !end_date) {
        return res.status(400).json({
          success: false,
          message: 'Start date and end date are required'
        });
      }

      let vehicle, unit;

      if (unit_id) {
        // If unit_id is provided, get the unit and its vehicle
        unit = await VehicleUnit.findByPk(unit_id, {
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

        if (!unit.isAvailable()) {
          return res.status(400).json({
            success: false,
            message: `Vehicle unit is not available. Current status: ${unit.getStatusDisplayName()}`
          });
        }

        vehicle = unit.vehicle;
        // Update vehicle_id to match the unit's vehicle for consistency
        vehicle_id = vehicle.id;
      } else {
        // Legacy: if only vehicle_id is provided, find an available unit
        vehicle = await Vehicle.findByPk(vehicle_id, {
          include: [
            {
              model: VehicleUnit,
              as: 'units',
              where: { status: 'available' },
              required: false
            }
          ]
        });

        if (!vehicle) {
          return res.status(404).json({
            success: false,
            message: 'Vehicle not found'
          });
        }

        // Find first available unit
        const availableUnits = vehicle.units || [];
        if (availableUnits.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No available units for this vehicle'
          });
        }

        unit = availableUnits[0];
      }

      // Ensure we have a valid vehicle_id for availability checking
      const effectiveVehicleId = vehicle_id || vehicle.id;

      // Check for overlapping rentals to ensure we don't exceed available units
      console.log(`Checking availability for vehicle ${effectiveVehicleId} from ${start_date} to ${end_date}`);

      const overlappingRentals = await Rental.count({
        where: {
          vehicle_id: effectiveVehicleId,
          status: ['pending', 'confirmed', 'active'],
          [Op.or]: [
            // New booking starts during existing rental
            {
              start_date: {
                [Op.lt]: end_date
              },
              end_date: {
                [Op.gt]: start_date
              }
            }
          ]
        }
      });

      // Also get the actual overlapping rentals for debugging
      const overlappingRentalDetails = await Rental.findAll({
        where: {
          vehicle_id: vehicle_id,
          status: ['pending', 'confirmed', 'active'],
          [Op.or]: [
            // Same logic as count query
            {
              start_date: {
                [Op.lt]: end_date
              },
              end_date: {
                [Op.gt]: start_date
              }
            }
          ]
        },
        attributes: ['id', 'start_date', 'end_date', 'status', 'user_id']
      });

      console.log(`Found ${overlappingRentals} overlapping rentals:`, overlappingRentalDetails.map(r => ({
        id: r.id,
        dates: `${r.start_date} to ${r.end_date}`,
        status: r.status,
        user_id: r.user_id
      })));

      const availableUnits = vehicle.unit - overlappingRentals;
      console.log(`Vehicle ${effectiveVehicleId}: Total units: ${vehicle.unit}, Overlapping rentals: ${overlappingRentals}, Available units: ${availableUnits}`);

      if (availableUnits <= 0) {
        return res.status(400).json({
          success: false,
          message: `No units available for the selected dates. Available: ${availableUnits}/${vehicle.unit} units. There are ${overlappingRentals} existing bookings for these dates.`
        });
      }

      console.log(`✅ Booking allowed: ${availableUnits} units available out of ${vehicle.unit} total units`);

      // Calculate rental details
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);
      const diffTime = Math.abs(endDate - startDate);
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const totalAmount = totalDays * vehicle.price_per_day;

      // Use transaction to ensure data consistency
      const { sequelize } = require('../models');
      const transaction = await sequelize.transaction();

      let rental, payment, snapResult;

      try {
        // Create rental
        rental = await Rental.create({
          user_id: userId,
          vehicle_id: effectiveVehicleId,
          unit_id: unit_id,
          start_date,
          end_date,
          total_days: totalDays,
          price_per_day: vehicle.price_per_day,
          total_amount: totalAmount,
          pickup_location,
          pickup_latitude,
          pickup_longitude,
          return_location,
          return_latitude,
          return_longitude,
          notes,
          status: 'pending'
        }, { transaction });

        // Update unit status to rented when rental is created
        if (unit && unit_id) {
          await unit.update({
            status: 'rented'
          }, { transaction });

          console.log(`✅ Unit ${unit.plate_number} status updated to 'rented'`);
        }

        // Update vehicle availability based on available units
        const { VehicleUnit } = require('../models');
        const availableUnitsCount = await VehicleUnit.count({
          where: {
            vehicle_id: effectiveVehicleId,
            status: 'available'
          },
          transaction
        });

        const vehicleStatus = availableUnitsCount > 0 ? 'available' : 'rented';
        await vehicle.update({
          status: vehicleStatus
        }, { transaction });

        console.log(`✅ Vehicle ${vehicle.title} status updated to '${vehicleStatus}' (${availableUnitsCount} units available)`);

        // Get user details for payment
        const user = await User.findByPk(userId, { transaction });

        // Create payment record
        payment = await Payment.create({
          rental_id: rental.id,
          user_id: userId,
          amount: totalAmount,
          payment_status: 'pending'
        }, { transaction });

        // Generate Midtrans transaction
        const transactionData = midtransService.formatTransactionData(rental, user);
        snapResult = await midtransService.createSnapToken(
          transactionData.transactionDetails,
          transactionData.customerDetails,
          transactionData.itemDetails
        );

        if (!snapResult.success) {
          throw new Error('Failed to create payment transaction: ' + snapResult.error);
        }

        // Update payment with Midtrans data
        await payment.update({
          midtrans_order_id: transactionData.orderId,
          snap_token: snapResult.token,
          snap_redirect_url: snapResult.redirect_url
        }, { transaction });

        // Commit transaction
        await transaction.commit();
      } catch (error) {
        // Rollback transaction on any error
        await transaction.rollback();

        console.error('Error creating rental:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create rental',
          error: error.message
        });
      }

      // Load rental with associations
      const rentalWithDetails = await Rental.findByPk(rental.id, {
        include: [
          { model: Vehicle, as: 'vehicle' },
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: Payment, as: 'payment' }
        ]
      });

      res.status(201).json({
        success: true,
        message: 'Rental created successfully',
        data: {
          rental: rentalWithDetails,
          payment: {
            snap_token: snapResult.token,
            redirect_url: snapResult.redirect_url
          }
        }
      });

    } catch (error) {
      console.error('Create rental error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get user rentals
  async getUserRentals(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const whereClause = { user_id: userId };
      if (status) {
        whereClause.status = status;
      }

      const rentals = await Rental.findAndCountAll({
        where: whereClause,
        include: [
          { model: Vehicle, as: 'vehicle' },
          { model: Payment, as: 'payment' }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json({
        success: true,
        data: {
          rentals: rentals.rows,
          pagination: {
            total: rentals.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(rentals.count / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get user rentals error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get rental by ID
  async getRentalById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const rental = await Rental.findOne({
        where: { id, user_id: userId },
        include: [
          { model: Vehicle, as: 'vehicle' },
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: Payment, as: 'payment' }
        ]
      });

      if (!rental) {
        return res.status(404).json({
          success: false,
          message: 'Rental not found'
        });
      }

      res.json({
        success: true,
        data: rental
      });

    } catch (error) {
      console.error('Get rental by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Cancel rental
  async cancelRental(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const rental = await Rental.findOne({
        where: { id, user_id: userId },
        include: [{ model: Payment, as: 'payment' }]
      });

      if (!rental) {
        return res.status(404).json({
          success: false,
          message: 'Rental not found'
        });
      }

      if (!rental.canBeCancelled()) {
        return res.status(400).json({
          success: false,
          message: 'Rental cannot be cancelled'
        });
      }

      // Use transaction to ensure data consistency
      const { sequelize } = require('../models');
      const transaction = await sequelize.transaction();

      try {
        // Cancel Midtrans transaction if exists
        if (rental.payment && rental.payment.midtrans_order_id) {
          await midtransService.cancelTransaction(rental.payment.midtrans_order_id);
        }

        // Update rental status
        await rental.update({ status: 'cancelled' }, { transaction });

        // Update payment status
        if (rental.payment) {
          await rental.payment.update({ payment_status: 'cancel' }, { transaction });
        }

        // Restore vehicle unit and update status
        await this.restoreVehicleUnit(rental.vehicle_id, transaction);

        // Commit transaction
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

      res.json({
        success: true,
        message: 'Rental cancelled successfully'
      });

    } catch (error) {
      console.error('Cancel rental error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Helper method to restore vehicle unit when rental is cancelled or completed
  async restoreVehicleUnit(vehicleId, transaction = null) {
    try {
      const vehicle = await Vehicle.findByPk(vehicleId, { transaction });
      if (!vehicle) {
        throw new Error('Vehicle not found');
      }

      // Increase unit count and update status if needed
      const newUnitCount = vehicle.unit + 1;
      const newStatus = newUnitCount > 0 ? 'available' : vehicle.status;

      await vehicle.update({
        unit: newUnitCount,
        status: newStatus
      }, { transaction });

      console.log(`Restored unit for vehicle ${vehicleId}. New unit count: ${newUnitCount}`);
    } catch (error) {
      console.error('Error restoring vehicle unit:', error);
      throw error;
    }
  }

  // Method to complete rental and restore vehicle unit
  async completeRental(req, res) {
    try {
      const { id } = req.params;
      const rental = await Rental.findByPk(id, {
        include: [
          { model: Vehicle, as: 'vehicle' },
          { model: VehicleUnit, as: 'unit' }
        ]
      });

      if (!rental) {
        return res.status(404).json({
          success: false,
          message: 'Rental not found'
        });
      }

      const { sequelize } = require('../models');
      const transaction = await sequelize.transaction();

      try {
        // Update rental status to completed
        await rental.update({ status: 'completed' }, { transaction });

        // Restore vehicle unit status to available
        if (rental.unit_id && rental.unit) {
          await rental.unit.update({
            status: 'available'
          }, { transaction });

          console.log(`✅ Unit ${rental.unit.plate_number} status restored to 'available'`);
        }

        // Update vehicle availability based on available units
        const { VehicleUnit } = require('../models');
        const availableUnitsCount = await VehicleUnit.count({
          where: {
            vehicle_id: rental.vehicle_id,
            status: 'available'
          },
          transaction
        });

        const vehicleStatus = availableUnitsCount > 0 ? 'available' : 'rented';
        await rental.vehicle.update({
          status: vehicleStatus
        }, { transaction });

        console.log(`✅ Vehicle ${rental.vehicle.title} status updated to '${vehicleStatus}' (${availableUnitsCount} units available)`);

        await transaction.commit();

        res.json({
          success: true,
          message: 'Rental completed successfully'
        });
      } catch (error) {
        await transaction.rollback();
        throw error;
      }

    } catch (error) {
      console.error('Complete rental error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Method to automatically complete expired rentals
  async completeExpiredRentals(req, res) {
    try {
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

      // Find all active rentals that have passed their end date
      const expiredRentals = await Rental.findAll({
        where: {
          status: ['active', 'confirmed'],
          end_date: {
            [Op.lt]: today // end_date is less than today
          }
        },
        include: [
          { model: Vehicle, as: 'vehicle' },
          { model: VehicleUnit, as: 'unit' }
        ]
      });

      console.log(`Found ${expiredRentals.length} expired rentals to complete`);

      const { sequelize } = require('../models');

      for (const rental of expiredRentals) {
        const transaction = await sequelize.transaction();

        try {
          // Update rental status to completed
          await rental.update({ status: 'completed' }, { transaction });

          // Restore vehicle unit status to available
          if (rental.unit_id && rental.unit) {
            await rental.unit.update({
              status: 'available'
            }, { transaction });

            console.log(`✅ Expired rental ${rental.id}: Unit ${rental.unit.plate_number} status restored to 'available'`);
          }

          // Update vehicle availability based on available units
          const availableUnitsCount = await VehicleUnit.count({
            where: {
              vehicle_id: rental.vehicle_id,
              status: 'available'
            },
            transaction
          });

          const vehicleStatus = availableUnitsCount > 0 ? 'available' : 'rented';
          await rental.vehicle.update({
            status: vehicleStatus
          }, { transaction });

          console.log(`✅ Expired rental ${rental.id}: Vehicle ${rental.vehicle.title} status updated to '${vehicleStatus}'`);

          await transaction.commit();
        } catch (error) {
          await transaction.rollback();
          console.error(`Error completing expired rental ${rental.id}:`, error);
        }
      }

      res.json({
        success: true,
        message: `Completed ${expiredRentals.length} expired rentals`,
        completedRentals: expiredRentals.length
      });

    } catch (error) {
      console.error('Error completing expired rentals:', error);
      res.status(500).json({
        success: false,
        message: 'Error completing expired rentals',
        error: error.message
      });
    }
  }

  // Get user rental statistics
  async getUserStats(req, res) {
    try {
      const userId = req.user.id;

      const stats = await Promise.all([
        // Total trips (completed rentals)
        Rental.count({
          where: {
            user_id: userId,
            status: 'completed'
          }
        }),

        // Active rentals
        Rental.count({
          where: {
            user_id: userId,
            status: ['active', 'approved']
          }
        }),

        // Get active rentals with details
        Rental.findAll({
          where: {
            user_id: userId,
            status: ['active', 'approved']
          },
          include: [
            { model: Vehicle, as: 'vehicle' },
            { model: Payment, as: 'payment' }
          ],
          order: [['created_at', 'DESC']]
        })
      ]);

      res.json({
        success: true,
        data: {
          total_trips: stats[0],
          active_rentals: stats[1],
          active_rental_details: stats[2]
        }
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user statistics',
        error: error.message
      });
    }
  }
}

module.exports = new RentalController();
