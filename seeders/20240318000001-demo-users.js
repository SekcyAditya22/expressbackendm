'use strict';

const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    await queryInterface.bulkInsert('users', [
      {
        name: 'Oke Pratama',
        email: 'oke@example.com',
        password: hashedPassword,
        role: 'user',
        phone_number: '+62 812-3456-7890',
        is_verified: true,
        profile_picture: null,
        last_login: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Sari Dewi',
        email: 'sari@example.com',
        password: hashedPassword,
        role: 'user',
        phone_number: '+62 813-4567-8901',
        is_verified: true,
        profile_picture: null,
        last_login: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Budi Santoso',
        email: 'budi@example.com',
        password: hashedPassword,
        role: 'user',
        phone_number: '+62 814-5678-9012',
        is_verified: false,
        profile_picture: null,
        last_login: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        phone_number: '+62 815-6789-0123',
        is_verified: true,
        profile_picture: null,
        last_login: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Maya Sari',
        email: 'maya@example.com',
        password: hashedPassword,
        role: 'user',
        phone_number: '+62 816-7890-1234',
        is_verified: true,
        profile_picture: null,
        last_login: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Rizki Pratama',
        email: 'rizki@example.com',
        password: hashedPassword,
        role: 'user',
        phone_number: '+62 817-8901-2345',
        is_verified: false,
        profile_picture: null,
        last_login: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
