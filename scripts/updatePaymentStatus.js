const { Payment, Rental } = require('../models');

async function updatePaymentStatus() {
  try {
    console.log('🔄 Updating latest payment status...');

    // Get the latest pending payment
    const payment = await Payment.findOne({
      where: { payment_status: 'pending' },
      include: [{ model: Rental, as: 'rental' }],
      order: [['created_at', 'DESC']]
    });

    if (!payment) {
      console.log('❌ No pending payment found');
      return;
    }

    console.log(`✅ Found payment ID: ${payment.id}, Order ID: ${payment.midtrans_order_id}`);
    console.log(`📅 Created at: ${payment.created_at}`);
    console.log(`🏠 Rental ID: ${payment.rental_id}`);

    // Update payment to settlement
    await payment.update({
      payment_status: 'settlement',
      paid_at: new Date(),
      payment_method: 'credit_card',
      midtrans_transaction_id: 'test-transaction-' + Date.now()
    });

    // Update rental to confirmed
    await payment.rental.update({
      status: 'confirmed',
      admin_approval_status: 'pending'
    });

    console.log('✅ Payment status updated to settlement');
    console.log('✅ Rental status updated to confirmed');
    console.log('✅ Admin approval status set to pending');
    console.log('🎉 User should now see "Payment confirmed - Waiting for admin approval"');
    console.log(`📱 Check TransactionScreen for rental ID: ${payment.rental_id}`);

  } catch (error) {
    console.error('❌ Error updating payment status:', error);
  } finally {
    process.exit(0);
  }
}

updatePaymentStatus();
