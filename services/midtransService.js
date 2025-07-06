const midtransClient = require('midtrans-client');

class MidtransService {
  constructor() {
    // Initialize Snap API client
    this.snap = new midtransClient.Snap({
      isProduction: false, // Set to true for production
      serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-YOUR_SERVER_KEY',
      clientKey: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-YOUR_CLIENT_KEY'
    });

    // Initialize Core API client for transaction status
    this.coreApi = new midtransClient.CoreApi({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-YOUR_SERVER_KEY',
      clientKey: process.env.MIDTRANS_CLIENT_KEY || 'SB-Mid-client-YOUR_CLIENT_KEY'
    });
  }

  /**
   * Create Snap transaction token
   * @param {Object} transactionDetails - Transaction details
   * @param {Object} customerDetails - Customer details
   * @param {Array} itemDetails - Item details
   * @returns {Promise<Object>} Snap transaction response
   */
  async createSnapToken(transactionDetails, customerDetails, itemDetails) {
    try {
      const parameter = {
        transaction_details: transactionDetails,
        customer_details: customerDetails,
        item_details: itemDetails,
        credit_card: {
          secure: true
        },
        callbacks: {
          finish: `${process.env.ANDROID_CALLBACK_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/success`,
          error: `${process.env.ANDROID_CALLBACK_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/error`,
          pending: `${process.env.ANDROID_CALLBACK_URL || process.env.FRONTEND_URL || 'http://localhost:3000'}/payment/pending`
        },
        notification_url: `http://192.168.1.104:8080/api/payments/notification`
      };

      const transaction = await this.snap.createTransaction(parameter);
      return {
        success: true,
        token: transaction.token,
        redirect_url: transaction.redirect_url,
        transaction: transaction
      };
    } catch (error) {
      console.error('Midtrans Snap Error:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }

  /**
   * Get transaction status from Midtrans
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Transaction status
   */
  async getTransactionStatus(orderId) {
    try {
      const statusResponse = await this.coreApi.transaction.status(orderId);
      return {
        success: true,
        status: statusResponse
      };
    } catch (error) {
      console.error('Midtrans Status Error:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }

  /**
   * Cancel transaction
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Cancel response
   */
  async cancelTransaction(orderId) {
    try {
      const cancelResponse = await this.coreApi.transaction.cancel(orderId);
      return {
        success: true,
        response: cancelResponse
      };
    } catch (error) {
      console.error('Midtrans Cancel Error:', error);
      return {
        success: false,
        error: error.message,
        details: error
      };
    }
  }

  /**
   * Verify notification signature
   * @param {Object} notification - Notification data
   * @returns {boolean} Is signature valid
   */
  verifySignature(notification) {
    try {
      const serverKey = process.env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-YOUR_SERVER_KEY';
      const orderId = notification.order_id;
      const statusCode = notification.status_code;
      const grossAmount = notification.gross_amount;
      const signatureKey = notification.signature_key;

      const crypto = require('crypto');
      const hash = crypto
        .createHash('sha512')
        .update(orderId + statusCode + grossAmount + serverKey)
        .digest('hex');

      return hash === signatureKey;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Process notification from Midtrans
   * @param {Object} notification - Notification data
   * @returns {Object} Processed notification
   */
  processNotification(notification) {
    const transactionStatus = notification.transaction_status;
    const fraudStatus = notification.fraud_status;
    let paymentStatus = 'pending';

    if (transactionStatus === 'capture') {
      if (fraudStatus === 'challenge') {
        paymentStatus = 'pending';
      } else if (fraudStatus === 'accept') {
        paymentStatus = 'settlement';
      }
    } else if (transactionStatus === 'settlement') {
      paymentStatus = 'settlement';
    } else if (transactionStatus === 'cancel' || 
               transactionStatus === 'deny' || 
               transactionStatus === 'expire') {
      paymentStatus = transactionStatus;
    } else if (transactionStatus === 'pending') {
      paymentStatus = 'pending';
    } else if (transactionStatus === 'failure') {
      paymentStatus = 'failure';
    }

    return {
      order_id: notification.order_id,
      transaction_id: notification.transaction_id,
      payment_status: paymentStatus,
      transaction_status: transactionStatus,
      fraud_status: fraudStatus,
      payment_method: notification.payment_type,
      gross_amount: notification.gross_amount,
      transaction_time: notification.transaction_time,
      settlement_time: notification.settlement_time,
      raw_notification: notification
    };
  }

  /**
   * Format transaction details for Snap
   * @param {Object} rental - Rental object
   * @param {Object} user - User object
   * @returns {Object} Formatted transaction data
   */
  formatTransactionData(rental, user) {
    const orderId = `RENTAL-${rental.id}-${Date.now()}`;
    
    const transactionDetails = {
      order_id: orderId,
      gross_amount: parseInt(rental.total_amount)
    };

    const customerDetails = {
      first_name: user.name || user.username,
      email: user.email,
      phone: user.phone || '',
      billing_address: {
        first_name: user.name || user.username,
        email: user.email,
        phone: user.phone || ''
      }
    };

    const itemDetails = [{
      id: `vehicle-${rental.vehicle_id}`,
      price: parseInt(rental.price_per_day),
      quantity: rental.total_days,
      name: `Vehicle Rental - ${rental.total_days} days`,
      category: 'Vehicle Rental'
    }];

    return {
      transactionDetails,
      customerDetails,
      itemDetails,
      orderId
    };
  }
}

module.exports = new MidtransService();
