'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('vehicle_units', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
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
      plate_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Vehicle license plate number'
      },
      status: {
        type: Sequelize.ENUM('available', 'rented', 'maintenance', 'out_of_service'),
        defaultValue: 'available',
        allowNull: false,
        comment: 'Current status of the vehicle unit'
      },
      current_location: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Current location of the vehicle unit'
      },
      current_latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true,
        comment: 'Current latitude coordinate'
      },
      current_longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true,
        comment: 'Current longitude coordinate'
      },
      mileage: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Current mileage in kilometers'
      },
      last_maintenance_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date of last maintenance'
      },
      next_maintenance_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'Date of next scheduled maintenance'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Additional notes about the vehicle unit'
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
    await queryInterface.addIndex('vehicle_units', ['vehicle_id']);
    await queryInterface.addIndex('vehicle_units', ['status']);
    await queryInterface.addIndex('vehicle_units', ['plate_number']);
    await queryInterface.addIndex('vehicle_units', ['current_location']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('vehicle_units');
  }
};
