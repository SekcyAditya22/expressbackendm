const express = require('express')
const cors = require('cors')
const http = require('http')
const socketIo = require('socket.io')
const app = express()
const server = http.createServer(app)
const userRoutes = require('./routes/userRoutes')
const vehicleRoutes = require('./routes/vehicleRoutes')
const userDetailsRoutes = require('./routes/userDetails')
const adminUserDetailsRoutes = require('./routes/adminUserDetails')
const userProfileRoutes = require('./routes/userProfile')
const rentalRoutes = require('./routes/rentals')
const paymentRoutes = require('./routes/payments')
const adminRentalRoutes = require('./routes/admin/rentals')
const chatRoutes = require('./routes/chat')

// Import rental scheduler
const rentalScheduler = require('./services/rentalScheduler')

// Socket.IO setup
const socketAuth = require('./socket/socketAuth')
const ChatHandlers = require('./socket/chatHandlers')

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// Socket.IO authentication middleware
io.use(socketAuth)

// Initialize chat handlers
const chatHandlers = new ChatHandlers(io)

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.name} (${socket.user.role})`)

  // Chat event handlers
  socket.on('join_chat', (data) => chatHandlers.handleJoinChat(socket, data))
  socket.on('leave_chat', (data) => chatHandlers.handleLeaveChat(socket, data))
  socket.on('send_message', (data) => chatHandlers.handleSendMessage(socket, data))
  socket.on('typing', (data) => chatHandlers.handleTyping(socket, data))
  socket.on('mark_as_read', (data) => chatHandlers.handleMarkAsRead(socket, data))

  // Handle disconnect
  socket.on('disconnect', () => chatHandlers.handleDisconnect(socket))
})

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Static files
app.use('/uploads', express.static('uploads'))

// Routes
app.use('/api', userRoutes)
app.use('/api', vehicleRoutes)
app.use('/api/user-details', userDetailsRoutes)
app.use('/api/admin/user-details', adminUserDetailsRoutes)
app.use('/api/user-profile', userProfileRoutes)
app.use('/api/rentals', rentalRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/admin/rentals', adminRentalRoutes)
app.use('/api/chat', chatRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    error: err.message
  })
})

const PORT = process.env.PORT || 8080
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at 192.168.31.55:${PORT}`)
  console.log(`Socket.IO server ready for connections`)

  // Start rental scheduler
  rentalScheduler.start()
})
