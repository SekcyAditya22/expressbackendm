'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Chat extends Model {
    static associate(models) {
      // Chat belongs to User (customer)
      Chat.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user'
      });

      // Chat belongs to Admin (optional)
      Chat.belongsTo(models.User, {
        foreignKey: 'admin_id',
        as: 'admin'
      });

      // Chat has many ChatMessages
      Chat.hasMany(models.ChatMessage, {
        foreignKey: 'chat_id',
        as: 'messages'
      });
    }

    // Instance methods
    async getUnreadMessagesCount(userId) {
      const ChatMessage = sequelize.models.ChatMessage;
      return await ChatMessage.count({
        where: {
          chat_id: this.id,
          sender_id: { [sequelize.Sequelize.Op.ne]: userId },
          is_read: false
        }
      });
    }

    async getLastMessage() {
      const ChatMessage = sequelize.models.ChatMessage;
      return await ChatMessage.findOne({
        where: { chat_id: this.id },
        order: [['created_at', 'DESC']],
        include: [{
          model: sequelize.models.User,
          as: 'sender',
          attributes: ['id', 'name', 'role']
        }]
      });
    }

    async markMessagesAsRead(userId) {
      const ChatMessage = sequelize.models.ChatMessage;
      return await ChatMessage.update(
        { 
          is_read: true,
          read_at: new Date()
        },
        {
          where: {
            chat_id: this.id,
            sender_id: { [sequelize.Sequelize.Op.ne]: userId },
            is_read: false
          }
        }
      );
    }
  }

  Chat.init({
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
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('active', 'closed'),
      defaultValue: 'active',
      allowNull: false
    },
    last_message_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Chat',
    tableName: 'chats',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  return Chat;
};
