const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",  // Allow all origins for testing
    methods: ["GET", "POST"]
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Store connected users and messages
const users = new Map();
const messageHistory = [];

// Debug function to log current state
const logState = () => {
  console.log('Current Users:', Array.from(users.entries()));
  console.log('Message History:', messageHistory);
};

io.on('connection', (socket) => {
  console.log('New client connected, ID:', socket.id);
  logState();

  socket.on('join', (nickname) => {
    console.log(`User ${nickname} (${socket.id}) is joining`);
    users.set(socket.id, nickname);
    
    // Broadcast to all clients
    io.emit('userJoined', nickname);
    io.emit('userList', Array.from(users.values()));
    
    console.log(`User ${nickname} joined successfully`);
    logState();
  });

  socket.on('message', (message) => {
    const nickname = users.get(socket.id);
    console.log(`Received message from ${nickname} (${socket.id}):`, message);
    
    if (nickname) {
      const messageObj = {
        user: nickname,
        text: message,
        time: new Date().toLocaleTimeString()
      };
      
      messageHistory.push(messageObj);
      if (messageHistory.length > 100) {
        messageHistory.shift();
      }
      
      // Broadcast to all clients
      io.emit('message', messageObj);
      console.log(`Broadcasted message from ${nickname}`);
      logState();
    } else {
      console.log('Message received from unknown user');
    }
  });

  socket.on('disconnect', () => {
    const nickname = users.get(socket.id);
    console.log(`User ${nickname} (${socket.id}) is disconnecting`);
    
    if (nickname) {
      users.delete(socket.id);
      io.emit('userLeft', nickname);
      io.emit('userList', Array.from(users.values()));
      console.log(`User ${nickname} left successfully`);
      logState();
    }
  });

  socket.on('clearChat', () => {
    messageHistory.length = 0; // Clear the array in-place
    io.emit('clearChat');
    console.log('Chat cleared for all users');
    setMessages([]);
    sessionStorage.removeItem('messages');
  });
});

// Every 10 seconds, clear the chat for everyone
setInterval(() => {
  messageHistory.length = 0; // Clear the array in-place
  io.emit('clearChat');
  console.log('Chat cleared for all users');
}, 10000);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Server is ready to accept connections');
}); 