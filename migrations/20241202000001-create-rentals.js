'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('rentals', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      vehicle_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'vehicles',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      total_days: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      price_per_day: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      total_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'approved', 'active', 'completed', 'cancelled', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
      },
      admin_approval_status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected'),
        defaultValue: 'pending',
        allowNull: false
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      pickup_location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      pickup_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      pickup_longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      return_location: {
        type: Sequelize.STRING,
        allowNull: true
      },
      return_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      return_longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
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
    await queryInterface.addIndex('rentals', ['user_id']);
    await queryInterface.addIndex('rentals', ['vehicle_id']);
    await queryInterface.addIndex('rentals', ['status']);
    await queryInterface.addIndex('rentals', ['start_date', 'end_date']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('rentals');
  }
};
