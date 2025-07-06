'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Vehicle extends Model {
    static associate(models) {
      // Vehicle has many Rentals (legacy - will be deprecated)
      Vehicle.hasMany(models.Rental, {
        foreignKey: 'vehicle_id',
        as: 'rentals'
      });

      // Vehicle has many VehicleUnits
      Vehicle.hasMany(models.VehicleUnit, {
        foreignKey: 'vehicle_id',
        as: 'units'
      });
    }

    // Instance methods
    isAvailable() {
      // Check if any units are available
      return this.units && this.units.some(unit => unit.status === 'available');
    }

    getAvailableUnitsCount() {
      if (!this.units) return 0;
      return this.units.filter(unit => unit.status === 'available').length;
    }

    getTotalUnitsCount() {
      return this.units ? this.units.length : 0;
    }

    getRentedUnitsCount() {
      if (!this.units) return 0;
      return this.units.filter(unit => unit.status === 'rented').length;
    }

    getMaintenanceUnitsCount() {
      if (!this.units) return 0;
      return this.units.filter(unit => unit.status === 'maintenance').length;
    }

    getOutOfServiceUnitsCount() {
      if (!this.units) return 0;
      return this.units.filter(unit => unit.status === 'out_of_service').length;
    }

    getAvailableUnits() {
      if (!this.units) return [];
      return this.units.filter(unit => unit.status === 'available');
    }

    // Get main photo for display
    getMainPhoto() {
      if (this.photos && this.photos.length > 0) {
        return this.photos[0];
      }
      return '/uploads/vehicles/default.jpg';
    }

    // Format price
    getFormattedPrice() {
      return `Rp ${this.price_per_day.toLocaleString('id-ID')}`;
    }

    // Get vehicle status based on units
    getVehicleStatus() {
      if (!this.units || this.units.length === 0) {
        return 'no_units';
      }

      const availableCount = this.getAvailableUnitsCount();
      const totalCount = this.getTotalUnitsCount();

      if (availableCount === 0) {
        return 'fully_rented';
      } else if (availableCount === totalCount) {
        return 'fully_available';
      } else {
        return 'partially_available';
      }
    }

    getStatusDisplayName() {
      const status = this.getVehicleStatus();
      const statusMap = {
        'no_units': 'No Units',
        'fully_rented': 'Fully Rented',
        'fully_available': 'Available',
        'partially_available': 'Partially Available'
      };
      return statusMap[status] || 'Unknown';
    }

    getStatusColor() {
      const status = this.getVehicleStatus();
      const colorMap = {
        'no_units': '#6B7280',        // Gray
        'fully_rented': '#EF4444',    // Red
        'fully_available': '#10B981', // Green
        'partially_available': '#F59E0B' // Orange
      };
      return colorMap[status] || '#6B7280';
    }
  }
  
  Vehicle.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false
    },
    vehicle_category: {
      type: DataTypes.STRING,
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    price_per_day: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('available', 'rented', 'maintenance'),
      defaultValue: 'available'
    },
    photos: {
      type: DataTypes.JSON,
      allowNull: true
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true
    },
    transmission: {
      type: DataTypes.ENUM('manual', 'automatic'),
      allowNull: false
    },
    fuel_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    passenger_capacity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE
    }
  }, {
    sequelize,
    modelName: 'Vehicle',
    tableName: 'vehicles'
  });
  
  return Vehicle;
}; 