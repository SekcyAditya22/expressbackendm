const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');

// Socket.IO authentication middleware
const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'name', 'email', 'role', 'profile_picture']
    });

    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user.id;
    socket.userRole = user.role;
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

module.exports = socketAuth;
