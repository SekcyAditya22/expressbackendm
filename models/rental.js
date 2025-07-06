'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Rental extends Model {
    static associate(models) {
      // Rental belongs to User
      Rental.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // Rental belongs to Vehicle (legacy - for backward compatibility)
      Rental.belongsTo(models.Vehicle, {
        foreignKey: 'vehicle_id',
        as: 'vehicle'
      });

      // Rental belongs to VehicleUnit (new relationship)
      Rental.belongsTo(models.VehicleUnit, {
        foreignKey: 'unit_id',
        as: 'unit'
      });

      // Rental has one Payment
      Rental.hasOne(models.Payment, {
        foreignKey: 'rental_id',
        as: 'payment'
      });

      // Rental belongs to Admin (approved_by)
      Rental.belongsTo(models.User, {
        foreignKey: 'approved_by',
        as: 'approvedBy'
      });
    }

    // Instance methods
    calculateTotalDays() {
      const start = new Date(this.start_date);
      const end = new Date(this.end_date);
      const diffTime = Math.abs(end - start);
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    calculateTotalAmount() {
      return this.total_days * this.price_per_day;
    }

    isActive() {
      const today = new Date();
      const startDate = new Date(this.start_date);
      const endDate = new Date(this.end_date);
      return today >= startDate && today <= endDate && this.status === 'active';
    }

    isExpired() {
      const today = new Date();
      const endDate = new Date(this.end_date);
      return today > endDate;
    }

    canBeCancelled() {
      const today = new Date();
      const startDate = new Date(this.start_date);
      return today < startDate && ['pending', 'confirmed', 'approved'].includes(this.status);
    }

    needsAdminApproval() {
      return this.admin_approval_status === 'pending' && this.status === 'confirmed';
    }

    isApproved() {
      return this.admin_approval_status === 'approved';
    }

    isRejected() {
      return this.admin_approval_status === 'rejected';
    }

    canBeApproved() {
      return this.admin_approval_status === 'pending' && this.status === 'confirmed';
    }
  }

  Rental.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    vehicle_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Made nullable for backward compatibility
      references: {
        model: 'vehicles',
        key: 'id'
      }
    },
    unit_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // Will be required in future versions
      references: {
        model: 'vehicle_units',
        key: 'id'
      }
    },
    start_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isAfter: {
          args: new Date().toISOString().split('T')[0],
          msg: 'Start date must be in the future'
        }
      }
    },
    end_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
        isAfterStartDate(value) {
          if (value <= this.start_date) {
            throw new Error('End date must be after start date');
          }
        }
      }
    },
    total_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1
      }
    },
    price_per_day: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'approved', 'active', 'completed', 'cancelled', 'rejected'),
      defaultValue: 'pending'
    },
    admin_approval_status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      defaultValue: 'pending'
    },
    approved_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    pickup_location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    pickup_latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    pickup_longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
    },
    return_location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    return_latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    return_longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Rental',
    tableName: 'rentals',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    hooks: {
      beforeValidate: (rental) => {
        if (rental.start_date && rental.end_date) {
          const start = new Date(rental.start_date);
          const end = new Date(rental.end_date);
          const diffTime = Math.abs(end - start);
          rental.total_days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          if (rental.price_per_day) {
            rental.total_amount = rental.total_days * rental.price_per_day;
          }
        }
      }
    }
  });

  // Add instance methods for vehicle unit support
  Rental.prototype.getVehicleInfo = function() {
    // Prioritize unit.vehicle over direct vehicle relationship
    if (this.unit && this.unit.vehicle) {
      return this.unit.vehicle;
    }
    return this.vehicle;
  };

  Rental.prototype.getUnitInfo = function() {
    return this.unit;
  };

  Rental.prototype.getPlateNumber = function() {
    if (this.unit) {
      return this.unit.getFormattedPlateNumber();
    }
    // Fallback to vehicle license_plate for legacy rentals
    if (this.vehicle) {
      return this.vehicle.license_plate;
    }
    return 'N/A';
  };

  Rental.prototype.hasVehicleUnit = function() {
    return !!this.unit_id;
  };

  return Rental;
};
