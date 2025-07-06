'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove license_plate column from vehicles table
    await queryInterface.removeColumn('vehicles', 'license_plate');
    
    // Remove unit column from vehicles table (since we now use vehicle_units)
    await queryInterface.removeColumn('vehicles', 'unit');
  },

  down: async (queryInterface, Sequelize) => {
    // Add back license_plate column
    await queryInterface.addColumn('vehicles', 'license_plate', {
      type: Sequelize.STRING,
      allowNull: true, // Make nullable for rollback
      unique: false // Remove unique constraint for rollback
    });
    
    // Add back unit column
    await queryInterface.addColumn('vehicles', 'unit', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });
  }
};
