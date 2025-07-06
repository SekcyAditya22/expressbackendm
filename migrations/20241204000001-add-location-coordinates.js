'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('rentals', 'pickup_latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
      comment: 'Latitude coordinate for pickup location'
    });

    await queryInterface.addColumn('rentals', 'pickup_longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Longitude coordinate for pickup location'
    });

    await queryInterface.addColumn('rentals', 'return_latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
      comment: 'Latitude coordinate for return location'
    });

    await queryInterface.addColumn('rentals', 'return_longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
      comment: 'Longitude coordinate for return location'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('rentals', 'pickup_latitude');
    await queryInterface.removeColumn('rentals', 'pickup_longitude');
    await queryInterface.removeColumn('rentals', 'return_latitude');
    await queryInterface.removeColumn('rentals', 'return_longitude');
  }
};
