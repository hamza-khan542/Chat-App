import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';

// Create socket connection with explicit configuration
const socket = io('http://localhost:3001', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

function App() {
  const [nickname, setNickname] = useState(() => sessionStorage.getItem('nickname') || '');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState(() => {
    const savedMessages = sessionStorage.getItem('messages');
    return savedMessages ? JSON.parse(savedMessages) : [];
  });
  const [users, setUsers] = useState([]);
  const [isJoined, setIsJoined] = useState(() => !!sessionStorage.getItem('nickname'));
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const messagesEndRef = useRef(null);

  // Connection status handling
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('connected');
      if (isJoined) {
        socket.emit('join', nickname);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
    };
  }, [isJoined, nickname]);

  useEffect(() => {
    socket.on('message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('clearChat', () => {
      setMessages([]);
    });

    socket.on('userJoined', (nickname) => {
      setMessages(prev => [...prev, { text: `${nickname} joined the chat`, system: true }]);
    });

    socket.on('userLeft', (nickname) => {
      setMessages(prev => [...prev, { text: `${nickname} left the chat`, system: true }]);
    });

    socket.on('userList', (userList) => {
      setUsers(userList);
    });

    return () => {
      socket.off('message');
      socket.off('clearChat');
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('userList');
    };
  }, []);

  useEffect(() => {
    sessionStorage.setItem('messages', JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (nickname.trim()) {
      sessionStorage.setItem('nickname', nickname);
      socket.emit('join', nickname);
      setIsJoined(true);
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      socket.emit('message', message);
      setMessage('');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('nickname');
    sessionStorage.removeItem('messages');
    setIsJoined(false);
    setNickname('');
    setMessages([]);
    socket.disconnect();
    socket.connect();
  };

  if (!isJoined) {
    return (
      <div className="join-container">
        <form onSubmit={handleJoin} className="join-form">
          <h1>Join Chat</h1>
          <div className="connection-status">
            Status: {connectionStatus}
          </div>
          <input
            type="text"
            placeholder="Enter your nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
          />
          <button type="submit">Join</button>
        </form>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <h3>Online Users</h3>
        <div className="connection-status">
          Status: {connectionStatus}
        </div>
        <ul>
          {users.map((user, index) => (
            <li key={index}>{user}</li>
          ))}
        </ul>
        <button onClick={handleLogout} className="logout-button">Logout</button>
      </div>
      <div className="chat-main">
        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.system ? 'system' : ''}`}>
              {!msg.system && <span className="user">{msg.user}</span>}
              <span className="text">{msg.text}</span>
              {!msg.system && <span className="time">{msg.time}</span>}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSendMessage} className="message-form">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <button type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}

export default App;
