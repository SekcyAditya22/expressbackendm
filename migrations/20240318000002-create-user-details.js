'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('user_details', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
      ktp_number: {
        type: Sequelize.STRING(16),
        allowNull: true,
        unique: true
      },
      ktp_photo: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Path to KTP photo file'
      },
      sim_number: {
        type: Sequelize.STRING(12),
        allowNull: true,
        unique: true
      },
      sim_photo: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Path to SIM photo file'
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      date_of_birth: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      place_of_birth: {
        type: Sequelize.STRING,
        allowNull: true
      },
      gender: {
        type: Sequelize.ENUM('male', 'female'),
        allowNull: true
      },
      emergency_contact_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      emergency_contact_phone: {
        type: Sequelize.STRING,
        allowNull: true
      },
      emergency_contact_relation: {
        type: Sequelize.STRING,
        allowNull: true
      },
      is_ktp_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      is_sim_verified: {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      },
      verification_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Admin notes for verification process'
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      verified_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Admin user who verified the documents'
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

    // Add indexes for better performance
    await queryInterface.addIndex('user_details', ['user_id']);
    await queryInterface.addIndex('user_details', ['ktp_number']);
    await queryInterface.addIndex('user_details', ['sim_number']);
    await queryInterface.addIndex('user_details', ['is_ktp_verified']);
    await queryInterface.addIndex('user_details', ['is_sim_verified']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('user_details');
  }
};
