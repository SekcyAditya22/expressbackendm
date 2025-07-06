const { Chat, ChatMessage, User } = require('../models');
const { Op } = require('sequelize');

class ChatController {
  // Get or create chat for user
  async getOrCreateChat(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      let chat;

      if (userRole === 'user') {
        // For regular users, find or create their chat
        chat = await Chat.findOne({
          where: { user_id: userId },
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'profile_picture']
            },
            {
              model: User,
              as: 'admin',
              attributes: ['id', 'name', 'email', 'profile_picture']
            }
          ]
        });

        if (!chat) {
          chat = await Chat.create({
            user_id: userId,
            status: 'active'
          });

          // Reload with associations
          chat = await Chat.findByPk(chat.id, {
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'name', 'email', 'profile_picture']
              },
              {
                model: User,
                as: 'admin',
                attributes: ['id', 'name', 'email', 'profile_picture']
              }
            ]
          });
        }

        res.json({
          status: 'success',
          data: { chat }
        });
      } else {
        // For admin, this endpoint is not used
        res.status(403).json({
          status: 'error',
          message: 'Admins should use getAllChats endpoint'
        });
      }
    } catch (error) {
      console.error('Error getting/creating chat:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get or create chat'
      });
    }
  }

  // Get all chats (for admin)
  async getAllChats(req, res) {
    try {
      const userRole = req.user.role;

      if (userRole !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. Admin role required.'
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const offset = (page - 1) * limit;

      const { count, rows: chats } = await Chat.findAndCountAll({
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email', 'profile_picture']
          },
          {
            model: User,
            as: 'admin',
            attributes: ['id', 'name', 'email', 'profile_picture']
          }
        ],
        order: [['last_message_at', 'DESC'], ['created_at', 'DESC']],
        limit,
        offset
      });

      // Get last message and unread count for each chat
      const chatsWithDetails = await Promise.all(
        chats.map(async (chat) => {
          const lastMessage = await chat.getLastMessage();
          const unreadCount = await chat.getUnreadMessagesCount(req.user.id);
          
          return {
            ...chat.toJSON(),
            lastMessage,
            unreadCount
          };
        })
      );

      res.json({
        status: 'success',
        data: {
          chats: chatsWithDetails,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error getting all chats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get chats'
      });
    }
  }

  // Get messages for a specific chat
  async getChatMessages(req, res) {
    try {
      const { chatId } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const offset = (page - 1) * limit;

      // Verify user has access to this chat
      let chat;
      if (userRole === 'admin') {
        chat = await Chat.findByPk(chatId);
      } else {
        chat = await Chat.findOne({
          where: {
            id: chatId,
            user_id: userId
          }
        });
      }

      if (!chat) {
        return res.status(404).json({
          status: 'error',
          message: 'Chat not found or access denied'
        });
      }

      const { count, rows: messages } = await ChatMessage.findAndCountAll({
        where: { chat_id: chatId },
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'role', 'profile_picture']
        }],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      // Mark messages as read
      await chat.markMessagesAsRead(userId);

      res.json({
        status: 'success',
        data: {
          messages: messages.reverse(), // Reverse to show oldest first
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error getting chat messages:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get chat messages'
      });
    }
  }

  // Send message (REST endpoint - for fallback)
  async sendMessage(req, res) {
    try {
      const { chatId } = req.params;
      const { message, messageType = 'text', fileUrl = null } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Verify user has access to this chat
      let chat;
      if (userRole === 'admin') {
        chat = await Chat.findByPk(chatId);
      } else {
        chat = await Chat.findOne({
          where: {
            id: chatId,
            user_id: userId
          }
        });
      }

      if (!chat) {
        return res.status(404).json({
          status: 'error',
          message: 'Chat not found or access denied'
        });
      }

      // Create new message
      const newMessage = await ChatMessage.create({
        chat_id: chatId,
        sender_id: userId,
        message: message,
        message_type: messageType,
        file_url: fileUrl
      });

      // Update chat's last message timestamp
      await chat.update({
        last_message_at: new Date()
      });

      // Load message with sender info
      const messageWithSender = await ChatMessage.findByPk(newMessage.id, {
        include: [{
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'role', 'profile_picture']
        }]
      });

      res.status(201).json({
        status: 'success',
        data: {
          message: messageWithSender
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to send message'
      });
    }
  }

  // Update chat status (for admin)
  async updateChatStatus(req, res) {
    try {
      const { chatId } = req.params;
      const { status } = req.body;
      const userRole = req.user.role;

      if (userRole !== 'admin') {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. Admin role required.'
        });
      }

      const chat = await Chat.findByPk(chatId);
      if (!chat) {
        return res.status(404).json({
          status: 'error',
          message: 'Chat not found'
        });
      }

      await chat.update({ status });

      res.json({
        status: 'success',
        data: { chat }
      });
    } catch (error) {
      console.error('Error updating chat status:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update chat status'
      });
    }
  }
}

module.exports = new ChatController();
