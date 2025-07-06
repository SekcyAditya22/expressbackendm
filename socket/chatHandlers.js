const { Chat, ChatMessage, User } = require('../models');
const { Op } = require('sequelize');

class ChatHandlers {
  constructor(io) {
    this.io = io;
  }

  // Handle user joining their chat room
  async handleJoinChat(socket, data) {
    try {
      const { chatId } = data;
      const userId = socket.userId;
      const userRole = socket.userRole;

      // Verify user has access to this chat
      let chat;
      if (userRole === 'admin') {
        // Admin can join any chat
        chat = await Chat.findByPk(chatId);
      } else {
        // User can only join their own chat
        chat = await Chat.findOne({
          where: {
            id: chatId,
            user_id: userId
          }
        });
      }

      if (!chat) {
        socket.emit('error', { message: 'Chat not found or access denied' });
        return;
      }

      // Join the chat room
      const roomName = `chat_${chatId}`;
      socket.join(roomName);
      socket.currentChatId = chatId;

      // Mark messages as read
      await chat.markMessagesAsRead(userId);

      // Notify others in the room that user joined
      socket.to(roomName).emit('user_joined', {
        userId: userId,
        userName: socket.user.name,
        userRole: userRole
      });

      socket.emit('joined_chat', {
        chatId: chatId,
        message: 'Successfully joined chat'
      });

      console.log(`User ${socket.user.name} (${userRole}) joined chat ${chatId}`);
    } catch (error) {
      console.error('Error joining chat:', error);
      socket.emit('error', { message: 'Failed to join chat' });
    }
  }

  // Handle leaving chat room
  async handleLeaveChat(socket, data) {
    try {
      const { chatId } = data;
      const roomName = `chat_${chatId}`;
      
      socket.leave(roomName);
      socket.currentChatId = null;

      // Notify others in the room that user left
      socket.to(roomName).emit('user_left', {
        userId: socket.userId,
        userName: socket.user.name,
        userRole: socket.userRole
      });

      socket.emit('left_chat', {
        chatId: chatId,
        message: 'Successfully left chat'
      });

      console.log(`User ${socket.user.name} left chat ${chatId}`);
    } catch (error) {
      console.error('Error leaving chat:', error);
      socket.emit('error', { message: 'Failed to leave chat' });
    }
  }

  // Handle sending message
  async handleSendMessage(socket, data) {
    try {
      const { chatId, message, messageType = 'text', fileUrl = null } = data;
      const userId = socket.userId;
      const userRole = socket.userRole;

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
        socket.emit('error', { message: 'Chat not found or access denied' });
        return;
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

      // Emit to all users in the chat room
      const roomName = `chat_${chatId}`;
      this.io.to(roomName).emit('new_message', {
        message: messageWithSender.toJSON()
      });

      // If this is a user message, notify all admins
      if (userRole === 'user') {
        socket.broadcast.emit('new_user_message', {
          chatId: chatId,
          userId: userId,
          userName: socket.user.name,
          message: message,
          timestamp: newMessage.created_at
        });
      }

      // Also emit to all connected admins for real-time updates
      socket.broadcast.emit('chat_updated', {
        chatId: chatId,
        lastMessage: messageWithSender.toJSON(),
        timestamp: newMessage.created_at
      });

      console.log(`Message sent in chat ${chatId} by ${socket.user.name}`);
    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  // Handle typing indicator
  handleTyping(socket, data) {
    try {
      const { chatId, isTyping } = data;
      const roomName = `chat_${chatId}`;
      const userRole = socket.userRole;

      // Send typing indicator with role-specific name
      const typingData = {
        userId: socket.userId,
        userName: userRole === 'admin' ? 'Admin' : socket.user.name,
        userRole: userRole,
        isTyping: isTyping
      };

      socket.to(roomName).emit('user_typing', typingData);

      console.log(`${typingData.userName} ${isTyping ? 'started' : 'stopped'} typing in chat ${chatId}`);
    } catch (error) {
      console.error('Error handling typing:', error);
    }
  }

  // Handle marking messages as read
  async handleMarkAsRead(socket, data) {
    try {
      const { chatId } = data;
      const userId = socket.userId;

      const chat = await Chat.findByPk(chatId);
      if (!chat) {
        socket.emit('error', { message: 'Chat not found' });
        return;
      }

      await chat.markMessagesAsRead(userId);

      // Notify others in the room
      const roomName = `chat_${chatId}`;
      socket.to(roomName).emit('messages_read', {
        userId: userId,
        chatId: chatId
      });

      socket.emit('marked_as_read', {
        chatId: chatId,
        message: 'Messages marked as read'
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
      socket.emit('error', { message: 'Failed to mark messages as read' });
    }
  }

  // Handle disconnect
  handleDisconnect(socket) {
    console.log(`User ${socket.user?.name || 'Unknown'} disconnected`);
    
    // Leave current chat room if any
    if (socket.currentChatId) {
      const roomName = `chat_${socket.currentChatId}`;
      socket.to(roomName).emit('user_left', {
        userId: socket.userId,
        userName: socket.user?.name,
        userRole: socket.userRole
      });
    }
  }
}

module.exports = ChatHandlers;
