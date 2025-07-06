'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vehicles', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false
      },
      brand: {
        type: Sequelize.STRING,
        allowNull: false
      },
      model: {
        type: Sequelize.STRING,
        allowNull: false
      },
      vehicle_category: {
        type: Sequelize.STRING,
        allowNull: false
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      license_plate: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      price_per_day: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      unit: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('available', 'rented', 'maintenance'),
        defaultValue: 'available'
      },
      photos: {
        type: Sequelize.JSON,
        allowNull: true
      },
      features: {
        type: Sequelize.JSON,
        allowNull: true
      },
      transmission: {
        type: Sequelize.ENUM('manual', 'automatic'),
        allowNull: false
      },
      fuel_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      passenger_capacity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('vehicles');
  }
}; 