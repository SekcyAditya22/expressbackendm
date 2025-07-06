const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get or create chat for user
router.get('/my-chat', chatController.getOrCreateChat);

// Get all chats (for admin)
router.get('/all', chatController.getAllChats);

// Get messages for a specific chat
router.get('/:chatId/messages', chatController.getChatMessages);

// Send message (REST fallback)
router.post('/:chatId/messages', chatController.sendMessage);

// Update chat status (for admin)
router.patch('/:chatId/status', chatController.updateChatStatus);

module.exports = router;
