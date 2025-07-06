const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');

// Midtrans notification webhook (no auth required)
router.post('/notification', paymentController.handleNotification);

// Apply authentication middleware to protected routes
router.use(authenticateToken);

// Get payment status
router.get('/status/:orderId', paymentController.getPaymentStatus);

// Retry payment
router.post('/retry/:rentalId', paymentController.retryPayment);

// Get user payments
router.get('/', paymentController.getUserPayments);

// Manual payment status update (for testing)
router.patch('/:paymentId/status', paymentController.updatePaymentStatus);

// Test webhook endpoint
router.post('/test-webhook', (req, res) => {
  console.log('🔔 Test webhook received:', req.body);
  res.json({ success: true, message: 'Test webhook received' });
});

// Auto-update payment status endpoint (for testing)
router.post('/auto-update/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { Payment, Rental } = require('../models');

    console.log(`🔄 Auto-updating payment for order: ${orderId}`);

    const payment = await Payment.findOne({
      where: { midtrans_order_id: orderId },
      include: [{ model: Rental, as: 'rental' }]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Update payment to settlement
    await payment.update({
      payment_status: 'settlement',
      paid_at: new Date(),
      payment_method: 'credit_card'
    });

    // Update rental to confirmed
    await payment.rental.update({
      status: 'confirmed',
      admin_approval_status: 'pending'
    });

    console.log('✅ Payment auto-updated successfully');

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        payment_id: payment.id,
        rental_id: payment.rental.id,
        payment_status: 'settlement',
        rental_status: 'confirmed'
      }
    });

  } catch (error) {
    console.error('❌ Auto-update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Auto-update payment by rental ID (more reliable)
router.post('/auto-update-rental/:rentalId', async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { Payment, Rental } = require('../models');

    console.log(`🔄 Auto-updating payment for rental: ${rentalId}`);

    const payment = await Payment.findOne({
      where: { rental_id: rentalId },
      include: [{ model: Rental, as: 'rental' }],
      order: [['created_at', 'DESC']]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found for rental'
      });
    }

    // Update payment to settlement
    await payment.update({
      payment_status: 'settlement',
      paid_at: new Date(),
      payment_method: 'credit_card',
      midtrans_transaction_id: 'auto-update-' + Date.now()
    });

    // Update rental to confirmed
    await payment.rental.update({
      status: 'confirmed',
      admin_approval_status: 'pending'
    });

    console.log('✅ Payment auto-updated successfully');

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: {
        payment_id: payment.id,
        rental_id: payment.rental.id,
        payment_status: 'settlement',
        rental_status: 'confirmed'
      }
    });

  } catch (error) {
    console.error('❌ Auto-update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
