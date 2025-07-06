'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserDetails extends Model {
    static associate(models) {
      // Define association with User model
      UserDetails.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });
      
      // Association with admin who verified the documents
      UserDetails.belongsTo(models.User, {
        foreignKey: 'verified_by',
        as: 'verifiedBy'
      });
    }

    // Instance method to check if documents are complete
    isDocumentsComplete() {
      return this.ktp_number && this.ktp_photo && this.sim_number && this.sim_photo;
    }

    // Instance method to check if documents are verified
    isDocumentsVerified() {
      return this.is_ktp_verified && this.is_sim_verified;
    }

    // Instance method to get verification status
    getVerificationStatus() {
      if (this.isDocumentsVerified()) {
        return 'verified';
      } else if (this.isDocumentsComplete()) {
        return 'pending';
      } else {
        return 'incomplete';
      }
    }
  }
  
  UserDetails.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'User ID is required'
        }
      }
    },
    ktp_number: {
      type: DataTypes.STRING(16),
      allowNull: true,
      unique: {
        msg: 'KTP number already exists'
      },
      validate: {
        len: {
          args: [16, 16],
          msg: 'KTP number must be exactly 16 digits'
        },
        isNumeric: {
          msg: 'KTP number must contain only numbers'
        }
      }
    },
    ktp_photo: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: {
          msg: 'KTP photo path cannot be empty'
        }
      }
    },
    sim_number: {
      type: DataTypes.STRING(12),
      allowNull: true,
      unique: {
        msg: 'SIM number already exists'
      },
      validate: {
        len: {
          args: [8, 12],
          msg: 'SIM number must be between 8-12 characters'
        }
      }
    },
    sim_photo: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        notEmpty: {
          msg: 'SIM photo path cannot be empty'
        }
      }
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    date_of_birth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      validate: {
        isDate: {
          msg: 'Invalid date format'
        },
        isBefore: {
          args: new Date().toISOString().split('T')[0],
          msg: 'Date of birth must be in the past'
        }
      }
    },
    place_of_birth: {
      type: DataTypes.STRING,
      allowNull: true
    },
    gender: {
      type: DataTypes.ENUM('male', 'female'),
      allowNull: true,
      validate: {
        isIn: {
          args: [['male', 'female']],
          msg: 'Gender must be either male or female'
        }
      }
    },
    emergency_contact_name: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: {
          args: [2, 100],
          msg: 'Emergency contact name must be between 2-100 characters'
        }
      }
    },
    emergency_contact_phone: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: {
          args: /^(\+62|62|0)[0-9]{9,13}$/,
          msg: 'Invalid Indonesian phone number format'
        }
      }
    },
    emergency_contact_relation: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_ktp_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    is_sim_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    verification_notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'UserDetails',
    tableName: 'user_details',
    timestamps: true,
    hooks: {
      beforeUpdate: (userDetails) => {
        // Auto-set verified_at when documents are verified
        if (userDetails.changed('is_ktp_verified') || userDetails.changed('is_sim_verified')) {
          if (userDetails.is_ktp_verified && userDetails.is_sim_verified) {
            userDetails.verified_at = new Date();
          }
        }
      }
    }
  });

  return UserDetails;
};
