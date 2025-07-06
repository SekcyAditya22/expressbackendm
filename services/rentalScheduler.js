const cron = require('node-cron');
const { Rental, Vehicle, VehicleUnit } = require('../models');
const { Op } = require('sequelize');

class RentalScheduler {
  constructor() {
    this.isRunning = false;
  }

  // Start the scheduler
  start() {
    if (this.isRunning) {
      console.log('⚠️ Rental scheduler is already running');
      return;
    }

    // Run every hour at minute 0
    this.job = cron.schedule('0 * * * *', async () => {
      console.log('🔄 Running rental scheduler...');
      await this.completeExpiredRentals();
    }, {
      scheduled: false
    });

    this.job.start();
    this.isRunning = true;
    console.log('✅ Rental scheduler started - will run every hour');

    // Run once immediately on startup
    setTimeout(() => {
      this.completeExpiredRentals();
    }, 5000); // Wait 5 seconds after startup
  }

  // Stop the scheduler
  stop() {
    if (this.job) {
      this.job.stop();
      this.isRunning = false;
      console.log('🛑 Rental scheduler stopped');
    }
  }

  // Method to automatically complete expired rentals
  async completeExpiredRentals() {
    try {
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      
      console.log(`🔍 Checking for expired rentals (end_date < ${today})...`);
      
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

      if (expiredRentals.length === 0) {
        console.log('✅ No expired rentals found');
        return {
          success: true,
          completedRentals: 0
        };
      }

      console.log(`📋 Found ${expiredRentals.length} expired rentals to complete`);

      const { sequelize } = require('../models');
      let completedCount = 0;
      
      for (const rental of expiredRentals) {
        const transaction = await sequelize.transaction();
        
        try {
          console.log(`⏰ Processing expired rental ${rental.id} (ended: ${rental.end_date})`);
          
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
          completedCount++;
          
        } catch (error) {
          await transaction.rollback();
          console.error(`❌ Error completing expired rental ${rental.id}:`, error);
        }
      }

      console.log(`🎉 Completed ${completedCount}/${expiredRentals.length} expired rentals`);

      return {
        success: true,
        completedRentals: completedCount,
        totalFound: expiredRentals.length
      };

    } catch (error) {
      console.error('❌ Error in rental scheduler:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new RentalScheduler();
