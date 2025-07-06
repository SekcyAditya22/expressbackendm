'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // First, update the status enum to include new values
    await queryInterface.sequelize.query(`
      ALTER TABLE rentals
      MODIFY COLUMN status ENUM('pending', 'confirmed', 'approved', 'active', 'completed', 'cancelled', 'rejected')
      DEFAULT 'pending'
    `);

    // Add admin approval columns
    await queryInterface.addColumn('rentals', 'admin_approval_status', {
      type: Sequelize.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending',
      allowNull: false
    });

    await queryInterface.addColumn('rentals', 'approved_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.addColumn('rentals', 'approved_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('rentals', 'rejection_reason', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down (queryInterface, Sequelize) {
    // Remove added columns
    await queryInterface.removeColumn('rentals', 'rejection_reason');
    await queryInterface.removeColumn('rentals', 'approved_at');
    await queryInterface.removeColumn('rentals', 'approved_by');
    await queryInterface.removeColumn('rentals', 'admin_approval_status');

    // Revert status enum to original values
    await queryInterface.sequelize.query(`
      ALTER TABLE rentals
      MODIFY COLUMN status ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled')
      DEFAULT 'pending'
    `);
  }
};
