const { Payment, Rental, Vehicle, User } = require('../models');
const midtransService = require('../services/midtransService');

class PaymentController {
  // Handle Midtrans notification webhook
  async handleNotification(req, res) {
    try {
      const notification = req.body;
      console.log('=== MIDTRANS WEBHOOK RECEIVED ===');
      console.log('Notification:', JSON.stringify(notification, null, 2));

      // Verify signature
      if (!midtransService.verifySignature(notification)) {
        console.log('❌ Invalid signature');
        return res.status(400).json({
          success: false,
          message: 'Invalid signature'
        });
      }

      console.log('✅ Signature verified');

      // Process notification
      const processedNotification = midtransService.processNotification(notification);
      console.log('Processed notification:', processedNotification);

      // Find payment by order ID
      const payment = await Payment.findOne({
        where: { midtrans_order_id: processedNotification.order_id },
        include: [
          {
            model: Rental,
            as: 'rental',
            include: [{ model: Vehicle, as: 'vehicle' }]
          }
        ]
      });

      if (!payment) {
        console.log('❌ Payment not found for order_id:', processedNotification.order_id);
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      console.log('✅ Payment found:', payment.id);

      // Update payment status
      console.log('Updating payment status to:', processedNotification.payment_status);
      await payment.update({
        payment_status: processedNotification.payment_status,
        midtrans_transaction_id: processedNotification.transaction_id,
        payment_method: processedNotification.payment_method,
        payment_response: processedNotification.raw_notification,
        paid_at: ['settlement', 'capture'].includes(processedNotification.payment_status)
          ? new Date()
          : null
      });

      // Update rental status based on payment status
      if (processedNotification.payment_status === 'settlement' ||
          processedNotification.payment_status === 'capture') {

        console.log('✅ Payment successful - updating rental to confirmed');
        // Payment successful - set to confirmed and wait for admin approval
        await payment.rental.update({
          status: 'confirmed',
          admin_approval_status: 'pending'
        });

      } else if (['deny', 'cancel', 'expire', 'failure'].includes(processedNotification.payment_status)) {
        console.log('❌ Payment failed - updating rental to cancelled');
        await payment.rental.update({ status: 'cancelled' });
      }

      console.log('=== WEBHOOK PROCESSING COMPLETE ===');

      res.json({
        success: true,
        message: 'Notification processed successfully'
      });

    } catch (error) {
      console.error('Payment notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get payment status
  async getPaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      const userId = req.user.id;

      const payment = await Payment.findOne({
        where: { midtrans_order_id: orderId },
        include: [
          { 
            model: Rental, 
            as: 'rental',
            where: { user_id: userId },
            include: [{ model: Vehicle, as: 'vehicle' }]
          }
        ]
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // Get latest status from Midtrans
      const statusResult = await midtransService.getTransactionStatus(orderId);
      
      if (statusResult.success) {
        const processedStatus = midtransService.processNotification(statusResult.status);
        
        // Update payment with latest status
        await payment.update({
          payment_status: processedStatus.payment_status,
          payment_response: statusResult.status
        });
      }

      res.json({
        success: true,
        data: {
          payment,
          midtrans_status: statusResult.success ? statusResult.status : null
        }
      });

    } catch (error) {
      console.error('Get payment status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Retry payment
  async retryPayment(req, res) {
    try {
      const { rentalId } = req.params;
      const userId = req.user.id;

      const rental = await Rental.findOne({
        where: { id: rentalId, user_id: userId },
        include: [
          { model: Payment, as: 'payment' },
          { model: Vehicle, as: 'vehicle' }
        ]
      });

      if (!rental) {
        return res.status(404).json({
          success: false,
          message: 'Rental not found'
        });
      }

      if (!rental.payment || !rental.payment.canBeRetried()) {
        return res.status(400).json({
          success: false,
          message: 'Payment cannot be retried'
        });
      }

      // Get user details
      const user = await User.findByPk(userId);

      // Generate new Midtrans transaction
      const transactionData = midtransService.formatTransactionData(rental, user);
      const snapResult = await midtransService.createSnapToken(
        transactionData.transactionDetails,
        transactionData.customerDetails,
        transactionData.itemDetails
      );

      if (!snapResult.success) {
        return res.status(500).json({
          success: false,
          message: 'Failed to create payment transaction',
          error: snapResult.error
        });
      }

      // Update payment with new Midtrans data
      await rental.payment.update({
        midtrans_order_id: transactionData.orderId,
        snap_token: snapResult.token,
        snap_redirect_url: snapResult.redirect_url,
        payment_status: 'pending'
      });

      res.json({
        success: true,
        message: 'Payment retry created successfully',
        data: {
          snap_token: snapResult.token,
          redirect_url: snapResult.redirect_url
        }
      });

    } catch (error) {
      console.error('Retry payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Get user payments
  async getUserPayments(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10, status } = req.query;

      const whereClause = { user_id: userId };
      if (status) {
        whereClause.payment_status = status;
      }

      const payments = await Payment.findAndCountAll({
        where: whereClause,
        include: [
          { 
            model: Rental, 
            as: 'rental',
            include: [{ model: Vehicle, as: 'vehicle' }]
          }
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      res.json({
        success: true,
        data: {
          payments: payments.rows,
          pagination: {
            total: payments.count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(payments.count / parseInt(limit))
          }
        }
      });

    } catch (error) {
      console.error('Get user payments error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  // Manual payment status update for testing
  async updatePaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const { status } = req.body;

      const payment = await Payment.findByPk(paymentId, {
        include: [
          {
            model: Rental,
            as: 'rental',
            include: [{ model: Vehicle, as: 'vehicle' }]
          }
        ]
      });

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      // Update payment status
      await payment.update({
        payment_status: status,
        paid_at: ['settlement', 'capture'].includes(status) ? new Date() : null
      });

      // Update rental status
      if (status === 'settlement' || status === 'capture') {
        await payment.rental.update({
          status: 'confirmed',
          admin_approval_status: 'pending'
        });
      } else if (['deny', 'cancel', 'expire', 'failure'].includes(status)) {
        await payment.rental.update({ status: 'cancelled' });
      }

      res.json({
        success: true,
        message: 'Payment status updated successfully',
        data: payment
      });

    } catch (error) {
      console.error('Update payment status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = new PaymentController();
