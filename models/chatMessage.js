'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ChatMessage extends Model {
    static associate(models) {
      // ChatMessage belongs to Chat
      ChatMessage.belongsTo(models.Chat, {
        foreignKey: 'chat_id',
        as: 'chat'
      });

      // ChatMessage belongs to User (sender)
      ChatMessage.belongsTo(models.User, {
        foreignKey: 'sender_id',
        as: 'sender'
      });
    }

    // Instance methods
    isFromUser() {
      return this.sender && this.sender.role === 'user';
    }

    isFromAdmin() {
      return this.sender && this.sender.role === 'admin';
    }

    async markAsRead() {
      if (!this.is_read) {
        this.is_read = true;
        this.read_at = new Date();
        await this.save();
      }
    }

    // Format message for API response
    toJSON() {
      const values = Object.assign({}, this.get());
      
      // Format timestamps
      if (values.created_at) {
        values.created_at = new Date(values.created_at).toISOString();
      }
      if (values.updated_at) {
        values.updated_at = new Date(values.updated_at).toISOString();
      }
      if (values.read_at) {
        values.read_at = new Date(values.read_at).toISOString();
      }

      return values;
    }
  }

  ChatMessage.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    chat_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'chats',
        key: 'id'
      }
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Message cannot be empty'
        },
        len: {
          args: [1, 5000],
          msg: 'Message must be between 1 and 5000 characters'
        }
      }
    },
    message_type: {
      type: DataTypes.ENUM('text', 'image', 'file'),
      defaultValue: 'text',
      allowNull: false
    },
    file_url: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_read: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    read_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ChatMessage',
    tableName: 'chat_messages',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return ChatMessage;
};
