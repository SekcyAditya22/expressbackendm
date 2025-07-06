const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config/config');

exports.authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                status: 'error',
                message: 'Access token not found'
            });
        }

        const decoded = jwt.verify(token, config.jwtSecret);
        const user = await User.findByPk(decoded.id);

        if (!user) {
            return res.status(401).json({
                status: 'error',
                message: 'User not found'
            });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({
            status: 'error',
            message: 'Invalid or expired token'
        });
    }
};

exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            status: 'error',
            message: 'Access denied. Admin privileges required.'
        });
    }
}; 