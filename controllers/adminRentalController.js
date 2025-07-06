const { Rental, Vehicle, User, Payment } = require('../models');
const { Op } = require('sequelize');

class AdminRentalController {
  // Get all rentals for admin
  async getAllRentals(req, res) {
    try {
      const { page = 1, limit = 10, status, approval_status } = req.query;

      const whereClause = {};
      if (status) {
        whereClause.status = status;
      }
      if (approval_status) {
        whereClause.admin_approval_status = approval_status;
      }

      const rentals = await Rental.findAndCountAll({
        where: whereClause,
        include: [
          { 
            model: Vehicle, 
            as: 'vehicle',
            attributes: ['id', 'title', 'brand', 'model', 'license_plate']
          },
          { 
            model: User, 
            as: 'user', 
            attributes: ['id', 'name', 'email', 'phone_number']
          },
          { 
            model: User, 
            as: 'approvedBy', 
            attributes: ['id', 'name', 'email']
          },
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
      console.error('Get all rentals error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get pending rentals for approval
  async getPendingRentals(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const rentals = await Rental.findAndCountAll({
        where: {
          admin_approval_status: 'pending',
          status: 'confirmed'
        },
        include: [
          { 
            model: Vehicle, 
            as: 'vehicle',
            attributes: ['id', 'title', 'brand', 'model', 'license_plate', 'photos']
          },
          { 
            model: User, 
            as: 'user', 
            attributes: ['id', 'name', 'email', 'phone_number']
          },
          { model: Payment, as: 'payment' }
        ],
        order: [['created_at', 'ASC']],
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
      console.error('Get pending rentals error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Approve rental
  async approveRental(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;

      const rental = await Rental.findByPk(id, {
        include: [
          { model: Vehicle, as: 'vehicle' },
          { model: User, as: 'user' },
          { model: Payment, as: 'payment' }
        ]
      });

      if (!rental) {
        return res.status(404).json({
          success: false,
          message: 'Rental not found'
        });
      }

      if (!rental.canBeApproved()) {
        return res.status(400).json({
          success: false,
          message: 'Rental cannot be approved'
        });
      }

      // Update rental status
      await rental.update({
        admin_approval_status: 'approved',
        status: 'approved',
        approved_by: adminId,
        approved_at: new Date()
      });

      // Check if rental should start today
      const today = new Date();
      const startDate = new Date(rental.start_date);
      
      if (startDate <= today) {
        await rental.update({ status: 'active' });
        await rental.vehicle.update({ status: 'rented' });
      }

      res.json({
        success: true,
        message: 'Rental approved successfully',
        data: rental
      });

    } catch (error) {
      console.error('Approve rental error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Reject rental
  async rejectRental(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminId = req.user.id;

      const rental = await Rental.findByPk(id, {
        include: [
          { model: Vehicle, as: 'vehicle' },
          { model: User, as: 'user' },
          { model: Payment, as: 'payment' }
        ]
      });

      if (!rental) {
        return res.status(404).json({
          success: false,
          message: 'Rental not found'
        });
      }

      if (!rental.canBeApproved()) {
        return res.status(400).json({
          success: false,
          message: 'Rental cannot be rejected'
        });
      }

      // Update rental status
      await rental.update({
        admin_approval_status: 'rejected',
        status: 'rejected',
        approved_by: adminId,
        approved_at: new Date(),
        rejection_reason: reason || 'No reason provided'
      });

      // Update payment status if exists
      if (rental.payment) {
        await rental.payment.update({
          payment_status: 'cancel'
        });
      }

      res.json({
        success: true,
        message: 'Rental rejected successfully',
        data: rental
      });

    } catch (error) {
      console.error('Reject rental error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get rental statistics
  async getRentalStats(req, res) {
    try {
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

      res.json({
        success: true,
        data: {
          total_rentals: stats[0],
          pending_approvals: stats[1],
          active_rentals: stats[2],
          completed_rentals: stats[3],
          total_revenue: stats[4] || 0
        }
      });

    } catch (error) {
      console.error('Get rental stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new AdminRentalController();
