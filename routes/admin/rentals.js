const express = require('express');
const router = express.Router();
const { Rental, User, Vehicle, Payment, VehicleUnit } = require('../../models');
const { authenticateToken, isAdmin } = require('../../middleware/auth');

// Get all pending rentals (confirmed but waiting admin approval)
router.get('/pending', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('🔍 Getting pending rentals for admin approval...');
    
    const rentals = await Rental.findAll({
      where: {
        status: 'confirmed',
        admin_approval_status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone_number']
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'title', 'brand', 'model', 'photos']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'payment_status', 'amount', 'paid_at']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Found ${rentals.length} pending rentals`);

    res.json({
      success: true,
      data: rentals
    });

  } catch (error) {
    console.error('❌ Error getting pending rentals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all rentals
router.get('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('🔍 Getting all rentals for admin...');
    
    const rentals = await Rental.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone_number']
        },
        {
          model: Vehicle,
          as: 'vehicle',
          attributes: ['id', 'title', 'brand', 'model', 'photos']
        },
        {
          model: Payment,
          as: 'payment',
          attributes: ['id', 'payment_status', 'amount', 'paid_at']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    console.log(`✅ Found ${rentals.length} total rentals`);

    res.json({
      success: true,
      data: rentals
    });

  } catch (error) {
    console.error('❌ Error getting all rentals:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Approve rental
router.patch('/:rentalId/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rentalId } = req.params;
    const adminId = req.user.id;

    console.log(`✅ Admin ${adminId} approving rental ${rentalId}...`);

    const rental = await Rental.findByPk(rentalId);
    
    if (!rental) {
      return res.status(404).json({
        success: false,
        message: 'Rental not found'
      });
    }

    // Update rental approval status
    await rental.update({
      admin_approval_status: 'approved',
      approved_by: adminId,
      approved_at: new Date(),
      status: 'active' // Change status to active when approved
    });

    console.log('✅ Rental approved successfully');

    res.json({
      success: true,
      message: 'Rental approved successfully'
    });

  } catch (error) {
    console.error('❌ Error approving rental:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Reject rental
router.patch('/:rentalId/reject', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    console.log(`❌ Admin ${adminId} rejecting rental ${rentalId}...`);

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const rental = await Rental.findByPk(rentalId);
    
    if (!rental) {
      return res.status(404).json({
        success: false,
        message: 'Rental not found'
      });
    }

    // Update rental rejection status
    await rental.update({
      admin_approval_status: 'rejected',
      approved_by: adminId,
      approved_at: new Date(),
      rejection_reason: reason,
      status: 'cancelled' // Change status to cancelled when rejected
    });

    console.log('✅ Rental rejected successfully');

    res.json({
      success: true,
      message: 'Rental rejected successfully'
    });

  } catch (error) {
    console.error('❌ Error rejecting rental:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Complete rental (admin action)
router.patch('/:rentalId/complete', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rentalId } = req.params;
    const adminId = req.user.id;

    console.log(`✅ Admin ${adminId} completing rental ${rentalId}...`);

    const rental = await Rental.findByPk(rentalId, {
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

    if (rental.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Only active rentals can be completed'
      });
    }

    const { sequelize } = require('../../models');
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
    console.error('❌ Error completing rental:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get rental statistics
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    console.log('📊 Getting rental statistics for admin dashboard...');

    const stats = await Promise.all([
      // Total rentals
      Rental.count(),

      // Pending approvals
      Rental.count({
        where: {
          admin_approval_status: 'pending',
          status: 'confirmed'
        }
      }),

      // Active rentals
      Rental.count({
        where: { status: 'active' }
      }),

      // Completed rentals
      Rental.count({
        where: { status: 'completed' }
      }),

      // Total revenue (from completed rentals)
      Rental.sum('total_amount', {
        where: { status: 'completed' }
      })
    ]);

    const result = {
      total_rentals: stats[0],
      pending_approvals: stats[1],
      active_rentals: stats[2],
      completed_rentals: stats[3],
      total_revenue: stats[4] || 0
    };

    console.log('✅ Rental statistics retrieved:', result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Error getting rental statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
