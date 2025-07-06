'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, add the new unit_id column
    await queryInterface.addColumn('rentals', 'unit_id', {
      type: Sequelize.INTEGER,
      allowNull: true, // Temporarily allow null for migration
      references: {
        model: 'vehicle_units',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT', // Prevent deletion of units that have rentals
      comment: 'Reference to the specific vehicle unit being rented'
    });

    // Add index for the new column
    await queryInterface.addIndex('rentals', ['unit_id']);

    // Note: In a real migration, you would need to:
    // 1. Create vehicle_units records for existing vehicles
    // 2. Update existing rentals to reference the appropriate unit_id
    // 3. Then remove the old vehicle_id column and make unit_id NOT NULL
    
    // For now, we'll keep both columns to allow gradual migration
    // The application logic will prioritize unit_id over vehicle_id
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the unit_id column
    await queryInterface.removeColumn('rentals', 'unit_id');
  }
};
