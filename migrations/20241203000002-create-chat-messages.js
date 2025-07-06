'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('chat_messages', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      chat_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'chats',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      message_type: {
        type: Sequelize.ENUM('text', 'image', 'file'),
        defaultValue: 'text',
        allowNull: false
      },
      file_url: {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'URL for image or file attachments'
      },
      is_read: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      read_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Add indexes for better performance
    await queryInterface.addIndex('chat_messages', ['chat_id']);
    await queryInterface.addIndex('chat_messages', ['sender_id']);
    await queryInterface.addIndex('chat_messages', ['created_at']);
    await queryInterface.addIndex('chat_messages', ['is_read']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('chat_messages');
  }
};
