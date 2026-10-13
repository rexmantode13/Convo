# Convo 💬
Chat-Web Application
A real-time WebSocket chat application built with Node.js, Express, and Socket.io.

## Features

- Real-time private messaging between users
- User registration with name validation
- Typing indicators
- Unread message counts
- Message history (last 100 messages per conversation)
- User presence tracking (online/offline)
- Responsive mobile-first design
- Messages are ephemeral (cleared when users disconnect)

## Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **WebSocket**: Socket.io for real-time bidirectional communication

## Project Structure

```
Convo/
├── public/           # Static files (client-side)
│   ├── index.html   # Main HTML
│   ├── app.js       # Client-side JavaScript
│   └── style.css    # Styles
├── server.js        # Express + Socket.io server
├── package.json     # Dependencies
├── render.yaml      # Render deployment config
└── .gitignore       # Git ignore rules
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Environment Setup

Create a `.env` file in the root directory (see `.env.example` for reference):

```bash
PORT=3000
NODE_ENV=development
```

## Running the Application

### Development

```bash
npm start
```

The server will start on port 3000 (or the port specified in `.env`).

Access the application at: `http://localhost:3000`

### Production (Render)

The `render.yaml` file is configured for deployment on Render.com. Simply push the repository to GitHub and connect it to Render.

## Usage

1. Open the application in a browser
2. Enter a username (2-20 characters)
3. See other online users in the contacts list
4. Click on a user to start a private chat
5. Send messages in real-time
6. Typing indicators show when the other user is typing
7. Unread badges show message counts

## API / Socket Events

### Client → Server

- `register(name, ack)` - Register a username
- `get_users(ack)` - Get list of online users
- `private_message({ to, text })` - Send a private message
- `get_messages(otherId, ack)` - Get message history with a user
- `typing({ to })` - Send typing indicator
- `stop_typing({ to })` - Stop typing indicator
- `mark_read({ from })` - Mark messages as read

### Server → Client

- `users(list)` - List of online users
- `private_message(msg)` - Incoming message
- `typing({ from })` - User is typing
- `stop_typing({ from })` - User stopped typing
- `user_left({ id, name })` - User disconnected

## 📜 License
© 2026 Convo.


