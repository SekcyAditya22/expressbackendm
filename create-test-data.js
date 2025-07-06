const { User, UserDetails } = require('./models');
const bcrypt = require('bcryptjs');

async function createTestData() {
    try {
        console.log('Creating test data...');
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('password123', salt);
        
        // Create test user
        const [user, created] = await User.findOrCreate({
            where: { email: 'test@example.com' },
            defaults: {
                name: 'Test User',
                email: 'test@example.com',
                password: hashedPassword,
                role: 'user',
                phone_number: '+62812345678',
                is_verified: true,
                profile_picture: null,
                last_login: null
            }
        });
        
        if (created) {
            console.log('Test user created:', user.name);
        } else {
            console.log('Test user already exists:', user.name);
        }
        
        // Create user details
        const [userDetails, detailsCreated] = await UserDetails.findOrCreate({
            where: { user_id: user.id },
            defaults: {
                user_id: user.id,
                ktp_number: '1234567890123456',
                ktp_photo: '/uploads/ktp/test_ktp.jpg',
                sim_number: 'A123456789',
                sim_photo: '/uploads/sim/test_sim.jpg',
                address: 'Jl. Sudirman No. 123, Jakarta Pusat, DKI Jakarta 10220',
                date_of_birth: '1995-05-15',
                place_of_birth: 'Jakarta',
                gender: 'male',
                emergency_contact_name: 'Emergency Contact',
                emergency_contact_phone: '+62812345679',
                emergency_contact_relation: 'Family',
                is_ktp_verified: true,
                is_sim_verified: false,
                verification_notes: 'KTP verified, SIM pending',
                verified_at: new Date(),
                verified_by: null
            }
        });
        
        if (detailsCreated) {
            console.log('User details created for:', user.name);
        } else {
            console.log('User details already exist for:', user.name);
        }
        
        console.log('Test data creation completed!');
        console.log('Login credentials:');
        console.log('Email: test@example.com');
        console.log('Password: password123');
        
    } catch (error) {
        console.error('Error creating test data:', error);
    }
}

// Run if called directly
if (require.main === module) {
    createTestData().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Script failed:', error);
        process.exit(1);
    });
}

module.exports = createTestData;
