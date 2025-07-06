const multer = require('multer');
const path = require('path');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Set destination based on file type
    let uploadPath = 'uploads/';
    
    if (file.fieldname === 'profile_picture') {
      uploadPath += 'profile_picture/';
    } else if (file.fieldname === 'ktp') {
      uploadPath += 'ktp/';
    } else if (file.fieldname === 'sim') {
      uploadPath += 'sim/';
    } else if (file.fieldname === 'photos') {
      uploadPath += 'vehicles/';
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF)$/)) {
    req.fileValidationError = 'Only image files are allowed!';
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// Create multer instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Function to handle multiple file uploads for a specific field
const uploadFiles = (fieldName, maxCount) => {
  return upload.array(fieldName, maxCount);
};

// Export multer instance with additional methods
module.exports = upload;
module.exports.uploadFiles = uploadFiles; 