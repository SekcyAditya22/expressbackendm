const axios = require('axios');
const crypto = require('crypto');

async function simulateWebhook() {
  try {
    console.log('🔄 Simulating Midtrans webhook...');
    
    // Sample webhook notification data
    const notification = {
      transaction_time: "2025-07-02 19:30:00",
      transaction_status: "settlement",
      transaction_id: "test-transaction-123",
      status_message: "midtrans payment notification",
      status_code: "200",
      signature_key: "dummy-signature",
      payment_type: "credit_card",
      order_id: "RENTAL-6-1751459670643", // Use the actual order ID
      merchant_id: "G141532850",
      gross_amount: "300000.00",
      fraud_status: "accept",
      currency: "IDR"
    };

    // Create signature (simplified for testing)
    const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-qMFfzixCGX9OH8x3Byo1SVS0';
    const signatureString = notification.order_id + notification.status_code + notification.gross_amount + serverKey;
    notification.signature_key = crypto.createHash('sha512').update(signatureString).digest('hex');

    console.log('📤 Sending webhook notification:', JSON.stringify(notification, null, 2));

    // Send to webhook endpoint
    const response = await axios.post('http://192.168.1.104:8080/api/payments/notification', notification, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Webhook response:', response.data);

  } catch (error) {
    console.error('❌ Error simulating webhook:', error.response?.data || error.message);
  }
}

simulateWebhook();
