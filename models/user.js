'use strict';
const { Model } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Define association with UserDetails model
      User.hasOne(models.UserDetails, {
        foreignKey: 'user_id',
        as: 'details'
      });

      // Association for users who verified documents (admin users)
      User.hasMany(models.UserDetails, {
        foreignKey: 'verified_by',
        as: 'verifiedDocuments'
      });

      // User has many Rentals
      User.hasMany(models.Rental, {
        foreignKey: 'user_id',
        as: 'rentals'
      });

      // User has many Payments
      User.hasMany(models.Payment, {
        foreignKey: 'user_id',
        as: 'payments'
      });

      // User has many Chats (as customer)
      User.hasMany(models.Chat, {
        foreignKey: 'user_id',
        as: 'chats'
      });

      // User has many Chats (as admin)
      User.hasMany(models.Chat, {
        foreignKey: 'admin_id',
        as: 'adminChats'
      });

      // User has many ChatMessages (as sender)
      User.hasMany(models.ChatMessage, {
        foreignKey: 'sender_id',
        as: 'sentMessages'
      });
    }
  }
  
  User.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Name is required'
        }
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        msg: 'Email already exists'
      },
      validate: {
        isEmail: {
          msg: 'Invalid email format'
        },
        notEmpty: {
          msg: 'Email is required'
        }
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Password is required'
        },
        len: {
          args: [6, 100],
          msg: 'Password must be at least 6 characters'
        }
      }
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
      allowNull: false
    },
    profile_picture: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_verified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    },
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true // This will add createdAt and updatedAt fields
  });

  // Instance method to check password
  User.prototype.checkPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  return User;
}; 