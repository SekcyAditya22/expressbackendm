const { body } = require('express-validator');

// Validation for updating user details
const updateUserDetailsValidation = [
    body('ktp_number')
        .optional()
        .isLength({ min: 16, max: 16 })
        .withMessage('KTP number must be exactly 16 digits')
        .isNumeric()
        .withMessage('KTP number must contain only numbers'),
    
    body('sim_number')
        .optional()
        .isLength({ min: 8, max: 12 })
        .withMessage('SIM number must be between 8-12 characters')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('SIM number must contain only uppercase letters and numbers'),
    
    body('address')
        .optional()
        .custom((value) => {
            if (value && value.trim().length > 0 && value.trim().length < 10) {
                throw new Error('Address must be at least 10 characters if provided');
            }
            if (value && value.length > 500) {
                throw new Error('Address must not exceed 500 characters');
            }
            return true;
        }),
    
    body('date_of_birth')
        .optional()
        .custom((value) => {
            if (!value) return true; // Allow empty/null values

            // Check date format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
                throw new Error('Date of birth must be in YYYY-MM-DD format');
            }

            const birthDate = new Date(value);
            const today = new Date();

            // Check if date is valid
            if (isNaN(birthDate.getTime())) {
                throw new Error('Invalid date format');
            }

            // Check if date is in the future
            if (birthDate > today) {
                throw new Error('Date of birth cannot be in the future');
            }

            // Calculate age more accurately
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();

            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 17 || age > 100) {
                throw new Error('Age must be between 17-100 years');
            }

            return true;
        }),
    
    body('place_of_birth')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Place of birth must be between 2-100 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Place of birth must contain only letters and spaces'),
    
    body('gender')
        .optional()
        .isIn(['male', 'female'])
        .withMessage('Gender must be either male or female'),
    
    body('emergency_contact_name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Emergency contact name must be between 2-100 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Emergency contact name must contain only letters and spaces'),
    
    body('emergency_contact_phone')
        .optional()
        .custom((value) => {
            if (!value) return true; // Allow empty values

            // Trim whitespace and tabs
            const cleanValue = value.trim();

            // Check Indonesian phone number format
            if (!/^(\+62|62|0)[0-9]{9,13}$/.test(cleanValue)) {
                throw new Error('Emergency contact phone must be a valid Indonesian phone number (+62xxxxxxxxx)');
            }

            return true;
        }),
    
    body('emergency_contact_relation')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('Emergency contact relation must be between 2-50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Emergency contact relation must contain only letters and spaces')
];

// Validation for KTP number only (for specific KTP updates)
const ktpNumberValidation = [
    body('ktp_number')
        .notEmpty()
        .withMessage('KTP number is required')
        .isLength({ min: 16, max: 16 })
        .withMessage('KTP number must be exactly 16 digits')
        .isNumeric()
        .withMessage('KTP number must contain only numbers')
];

// Validation for SIM number only (for specific SIM updates)
const simNumberValidation = [
    body('sim_number')
        .notEmpty()
        .withMessage('SIM number is required')
        .isLength({ min: 8, max: 12 })
        .withMessage('SIM number must be between 8-12 characters')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('SIM number must contain only uppercase letters and numbers')
];

// Validation for emergency contact
const emergencyContactValidation = [
    body('emergency_contact_name')
        .notEmpty()
        .withMessage('Emergency contact name is required')
        .isLength({ min: 2, max: 100 })
        .withMessage('Emergency contact name must be between 2-100 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Emergency contact name must contain only letters and spaces'),
    
    body('emergency_contact_phone')
        .notEmpty()
        .withMessage('Emergency contact phone is required')
        .matches(/^(\+62|62|0)[0-9]{9,13}$/)
        .withMessage('Emergency contact phone must be a valid Indonesian phone number'),
    
    body('emergency_contact_relation')
        .notEmpty()
        .withMessage('Emergency contact relation is required')
        .isLength({ min: 2, max: 50 })
        .withMessage('Emergency contact relation must be between 2-50 characters')
        .matches(/^[a-zA-Z\s]+$/)
        .withMessage('Emergency contact relation must contain only letters and spaces')
];

// Custom validation for complete profile
const completeProfileValidation = [
    body('ktp_number')
        .notEmpty()
        .withMessage('KTP number is required for complete profile')
        .isLength({ min: 16, max: 16 })
        .withMessage('KTP number must be exactly 16 digits')
        .isNumeric()
        .withMessage('KTP number must contain only numbers'),
    
    body('sim_number')
        .notEmpty()
        .withMessage('SIM number is required for complete profile')
        .isLength({ min: 8, max: 12 })
        .withMessage('SIM number must be between 8-12 characters')
        .matches(/^[A-Z0-9]+$/)
        .withMessage('SIM number must contain only uppercase letters and numbers'),
    
    body('address')
        .notEmpty()
        .withMessage('Address is required for complete profile')
        .isLength({ min: 10, max: 500 })
        .withMessage('Address must be between 10-500 characters'),
    
    body('date_of_birth')
        .notEmpty()
        .withMessage('Date of birth is required for complete profile')
        .isDate({ format: 'YYYY-MM-DD' })
        .withMessage('Date of birth must be in YYYY-MM-DD format'),
    
    body('place_of_birth')
        .notEmpty()
        .withMessage('Place of birth is required for complete profile')
        .isLength({ min: 2, max: 100 })
        .withMessage('Place of birth must be between 2-100 characters'),
    
    body('gender')
        .notEmpty()
        .withMessage('Gender is required for complete profile')
        .isIn(['male', 'female'])
        .withMessage('Gender must be either male or female'),
    
    ...emergencyContactValidation
];

module.exports = {
    updateUserDetailsValidation,
    ktpNumberValidation,
    simNumberValidation,
    emergencyContactValidation,
    completeProfileValidation
};
