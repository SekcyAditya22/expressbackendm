'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class VehicleUnit extends Model {
    static associate(models) {
      // VehicleUnit belongs to Vehicle
      VehicleUnit.belongsTo(models.Vehicle, {
        foreignKey: 'vehicle_id',
        as: 'vehicle'
      });

      // VehicleUnit has many Rentals
      VehicleUnit.hasMany(models.Rental, {
        foreignKey: 'unit_id',
        as: 'rentals'
      });
    }

    // Instance methods
    isAvailable() {
      return this.status === 'available';
    }

    isRented() {
      return this.status === 'rented';
    }

    isInMaintenance() {
      return this.status === 'maintenance';
    }

    isOutOfService() {
      return this.status === 'out_of_service';
    }

    async setRented() {
      this.status = 'rented';
      return await this.save();
    }

    async setAvailable() {
      this.status = 'available';
      return await this.save();
    }

    async setMaintenance() {
      this.status = 'maintenance';
      return await this.save();
    }

    async updateLocation(location, latitude = null, longitude = null) {
      this.current_location = location;
      if (latitude !== null) this.current_latitude = latitude;
      if (longitude !== null) this.current_longitude = longitude;
      return await this.save();
    }

    getFormattedPlateNumber() {
      return this.plate_number.toUpperCase();
    }

    getStatusDisplayName() {
      const statusMap = {
        'available': 'Available',
        'rented': 'Rented',
        'maintenance': 'In Maintenance',
        'out_of_service': 'Out of Service'
      };
      return statusMap[this.status] || this.status;
    }

    getStatusColor() {
      const colorMap = {
        'available': '#10B981', // Green
        'rented': '#F59E0B',    // Orange
        'maintenance': '#EF4444', // Red
        'out_of_service': '#6B7280' // Gray
      };
      return colorMap[this.status] || '#6B7280';
    }

    needsMaintenance() {
      if (!this.next_maintenance_date) return false;
      const today = new Date();
      const nextMaintenance = new Date(this.next_maintenance_date);
      return nextMaintenance <= today;
    }

    getMaintenanceStatus() {
      if (this.needsMaintenance()) {
        return 'overdue';
      }

      if (!this.next_maintenance_date) return 'unknown';

      const today = new Date();
      const nextMaintenance = new Date(this.next_maintenance_date);
      const daysUntilMaintenance = Math.ceil((nextMaintenance - today) / (1000 * 60 * 60 * 24));

      if (daysUntilMaintenance <= 7) {
        return 'due_soon';
      }

      return 'ok';
    }
  }

  VehicleUnit.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    vehicle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'vehicles',
        key: 'id'
      }
    },
    plate_number: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 20]
      }
    },
    status: {
      type: DataTypes.ENUM('available', 'rented', 'maintenance', 'out_of_service'),
      defaultValue: 'available',
      allowNull: false
    },
    current_location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    current_latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
      validate: {
        min: -90,
        max: 90
      }
    },
    current_longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
      validate: {
        min: -180,
        max: 180
      }
    },
    mileage: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    last_maintenance_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    next_maintenance_date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'VehicleUnit',
    tableName: 'vehicle_units',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return VehicleUnit;
};
