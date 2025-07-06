'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('payments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      rental_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'rentals',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      payment_method: {
        type: Sequelize.STRING,
        allowNull: true
      },
      payment_status: {
        type: Sequelize.ENUM('pending', 'settlement', 'capture', 'deny', 'cancel', 'expire', 'failure'),
        defaultValue: 'pending',
        allowNull: false
      },
      transaction_id: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      midtrans_transaction_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      midtrans_order_id: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      snap_token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      snap_redirect_url: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      payment_response: {
        type: Sequelize.JSON,
        allowNull: true
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('payments', ['rental_id']);
    await queryInterface.addIndex('payments', ['user_id']);
    await queryInterface.addIndex('payments', ['payment_status']);
    await queryInterface.addIndex('payments', ['transaction_id']);
    await queryInterface.addIndex('payments', ['midtrans_order_id']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('payments');
  }
};
