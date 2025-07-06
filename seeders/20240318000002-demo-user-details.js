'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('user_details', [
      {
        user_id: 1, // Oke Pratama
        ktp_number: '3171234567890001',
        ktp_photo: '/uploads/ktp/oke_ktp.jpg',
        sim_number: 'A1234567890',
        sim_photo: '/uploads/sim/oke_sim.jpg',
        address: 'Jl. Sudirman No. 123, Jakarta Pusat, DKI Jakarta 10220',
        date_of_birth: '1995-05-15',
        place_of_birth: 'Jakarta',
        gender: 'male',
        emergency_contact_name: 'Siti Pratama',
        emergency_contact_phone: '+62812345678',
        emergency_contact_relation: 'Mother',
        is_ktp_verified: true,
        is_sim_verified: true,
        verification_notes: 'All documents verified successfully',
        verified_at: new Date('2024-01-15T10:30:00Z'),
        verified_by: null, // Will be updated after admin user is created
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 2, // Sari Dewi
        ktp_number: '3271234567890002',
        ktp_photo: '/uploads/ktp/sari_ktp.jpg',
        sim_number: 'B2345678901',
        sim_photo: '/uploads/sim/sari_sim.jpg',
        address: 'Jl. Gatot Subroto No. 456, Bandung, Jawa Barat 40123',
        date_of_birth: '1992-08-22',
        place_of_birth: 'Bandung',
        gender: 'female',
        emergency_contact_name: 'Budi Dewi',
        emergency_contact_phone: '+62813456789',
        emergency_contact_relation: 'Husband',
        is_ktp_verified: true,
        is_sim_verified: false,
        verification_notes: 'KTP verified, SIM photo needs to be clearer',
        verified_at: null,
        verified_by: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 3, // Budi Santoso
        ktp_number: '3371234567890003',
        ktp_photo: null,
        sim_number: 'C3456789012',
        sim_photo: null,
        address: 'Jl. Diponegoro No. 789, Surabaya, Jawa Timur 60234',
        date_of_birth: '1988-12-10',
        place_of_birth: 'Surabaya',
        gender: 'male',
        emergency_contact_name: 'Maya Santoso',
        emergency_contact_phone: '+62814567890',
        emergency_contact_relation: 'Wife',
        is_ktp_verified: false,
        is_sim_verified: false,
        verification_notes: null,
        verified_at: null,
        verified_by: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        user_id: 4, // Admin User - skip for user details
        ktp_number: '3471234567890004',
        ktp_photo: '/uploads/ktp/admin_ktp.jpg',
        sim_number: 'D4567890123',
        sim_photo: '/uploads/sim/admin_sim.jpg',
        address: 'Jl. Admin No. 321, Jakarta, DKI Jakarta 10001',
        date_of_birth: '1985-03-18',
        place_of_birth: 'Jakarta',
        gender: 'male',
        emergency_contact_name: 'Admin Contact',
        emergency_contact_phone: '+62815678901',
        emergency_contact_relation: 'Family',
        is_ktp_verified: true,
        is_sim_verified: true,
        verification_notes: 'Admin verified',
        verified_at: new Date('2024-01-01T10:00:00Z'),
        verified_by: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('user_details', null, {});
  }
};
