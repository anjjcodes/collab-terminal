const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const pty = require('node-pty');
const crypto = require('crypto');  //to generate a random id to share 

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors : {origin : "http://localhost:3001"}
})

const sessions = {}; //stores active sessions;

io.on('connection', (socket) => {
  console.log('user connected:', socket.id);

  socket.on('create session', () => {
    const sessionId = crypto.randomBytes(4).toString('hex');
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'bash';

    const ptyProcess = pty.spawn(shell, [], {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env
    });

    sessions[sessionId] = { pty: ptyProcess, users: [] };  //=>storing sessions

    ptyProcess.onData((data) => {
      io.to(sessionId).emit('terminal output', data);
    });

    socket.join(sessionId);  //-> joiining that user to the room
    socket.sessionId = sessionId;
    sessions[sessionId].users.push(socket.id);

    socket.emit('session created', sessionId)
    console.log(`session created: ${sessionId}`);
  });

  //now to join existing session
  socket.on('join session', (sessionId) => {
    if (!sessions[sessionId]) {
      socket.emit('error', 'session not found');
      return;
    }

    socket.join(sessionId);
    socket.sessionId = sessionId;
    sessions[sessionId] = users.push(socket.id);

    socket.emit('session joined', sessionId);
    console.log(`user ${socket.id} joined session : ${sessionId}`);
  });

  socket.on('terminal input', (data) => {
    const session = sessions[socket.sessionId];
    if (session) {
      session.pty.write(data);
    }
  });

  socket.on('disconnect', () => {
    const sessionId = socket.sessionId;
    if (!sessionId || !sessions[sessionId]) return;

    sessions[sessionId].users = session[sessionId].users.filter(
      (id) => id !== socket.id
    );

    if (sessions[sessionId].users.length === 0) {
      sessions[sessionId].pty.kill();
      delete sessions[sessionId];
      console.log(`session ${sessionId} closed - no users left`);
    }
  });
});

httpServer.listen(3000, () => {
  console.log('server running on port 3000');
})
