'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      // Payment belongs to Rental
      Payment.belongsTo(models.Rental, {
        foreignKey: 'rental_id',
        as: 'rental'
      });

      // Payment belongs to User
      Payment.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
    }

    // Instance methods
    isPaid() {
      return ['settlement', 'capture'].includes(this.payment_status);
    }

    isPending() {
      return this.payment_status === 'pending';
    }

    isFailed() {
      return ['deny', 'cancel', 'expire', 'failure'].includes(this.payment_status);
    }

    canBeRetried() {
      return this.isFailed() || this.isPending();
    }

    generateOrderId() {
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      return `RENTAL-${this.rental_id}-${timestamp}-${random}`;
    }
  }

  Payment.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    rental_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'rentals',
        key: 'id'
      }
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: true
    },
    payment_status: {
      type: DataTypes.ENUM('pending', 'settlement', 'capture', 'deny', 'cancel', 'expire', 'failure'),
      defaultValue: 'pending'
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    midtrans_transaction_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    midtrans_order_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true
    },
    snap_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    snap_redirect_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    payment_response: {
      type: DataTypes.JSON,
      allowNull: true
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeCreate: (payment) => {
        if (!payment.midtrans_order_id) {
          payment.midtrans_order_id = payment.generateOrderId();
        }
      }
    }
  });

  return Payment;
};
