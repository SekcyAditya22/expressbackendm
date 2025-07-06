const { body } = require('express-validator');

// Validation for updating user profile
exports.updateUserProfileValidation = [
    body('name')
        .optional()
        .custom((value) => {
            if (!value) return true; // Allow empty values
            
            const trimmedValue = value.trim();
            
            if (trimmedValue.length < 2 || trimmedValue.length > 100) {
                throw new Error('Name must be between 2-100 characters');
            }
            
            if (!/^[a-zA-Z\s]+$/.test(trimmedValue)) {
                throw new Error('Name must contain only letters and spaces');
            }
            
            return true;
        }),
    
    body('phone_number')
        .optional()
        .custom((value) => {
            if (!value) return true; // Allow empty values
            
            const trimmedValue = value.trim();
            
            // Check Indonesian phone number format
            if (!/^(\+62|62|0)[0-9]{9,13}$/.test(trimmedValue)) {
                throw new Error('Phone number must be a valid Indonesian phone number (+62xxxxxxxxx)');
            }
            
            return true;
        })
];
