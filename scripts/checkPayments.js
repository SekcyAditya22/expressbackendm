const { Payment, Rental } = require('../models');

async function checkPayments() {
  try {
    console.log('🔍 Checking recent payments...');
    
    const payments = await Payment.findAll({
      include: [{ model: Rental, as: 'rental' }],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    console.log('\n📊 Recent Payments:');
    payments.forEach(payment => {
      console.log(`
ID: ${payment.id}
Rental ID: ${payment.rental_id}
Order ID: ${payment.midtrans_order_id}
Payment Status: ${payment.payment_status}
Rental Status: ${payment.rental?.status}
Created: ${payment.created_at}
---`);
    });

  } catch (error) {
    console.error('❌ Error checking payments:', error);
  } finally {
    process.exit(0);
  }
}

checkPayments();
