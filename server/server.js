const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const pty = require("node-pty");
const crypto = require("crypto");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:3000" },
});

const sessions = {};

io.on("connection", (socket) => {
  console.log("user connected:", socket.id);

  socket.on("create session", () => {
    const sessionId = crypto.randomBytes(4).toString("hex");
    const shell = process.platform === "win32" ? "powershell.exe" : "bash";

    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env,
    });

    sessions[sessionId] = { pty: ptyProcess, users: [] };

    ptyProcess.onData((data) => {
      io.to(sessionId).emit("terminal output", data);
    });

    socket.join(sessionId);
    socket.sessionId = sessionId;
    sessions[sessionId].users.push(socket.id);

    io.to(sessionId).emit("user count", sessions[sessionId].users.length);
    socket.emit("session created", sessionId);
    console.log(`session created: ${sessionId}`);
  });

  socket.on("join session", (sessionId) => {
    if (!sessions[sessionId]) {
      socket.emit("error", "session not found");
      return;
    }

    socket.join(sessionId);
    socket.sessionId = sessionId;
    sessions[sessionId].users.push(socket.id);

    io.to(sessionId).emit("user count", sessions[sessionId].users.length);
    socket.emit("session joined", sessionId);
    console.log(`user ${socket.id} joined session: ${sessionId}`);
  });

  socket.on("terminal input", (data) => {
    const session = sessions[socket.sessionId];
    if (session) {
      session.pty.write(data);
    }
  });

  socket.on("disconnect", () => {
    const sessionId = socket.sessionId;
    if (!sessionId || !sessions[sessionId]) return;

    sessions[sessionId].users = sessions[sessionId].users.filter(
      (id) => id !== socket.id
    );

    io.to(sessionId).emit("user count", sessions[sessionId].users.length);

    // wait 5 seconds before cleanup — gives time for page navigation
    setTimeout(() => {
      if (!sessions[sessionId]) return;
      if (sessions[sessionId].users.length === 0) {
        if (process.platform !== "win32") {
          try {
            sessions[sessionId].pty.kill();
          } catch (e) {
            console.log("pty kill error:", e.message);
          }
        }
        delete sessions[sessionId];
        console.log(`session ${sessionId} closed`);
      }
    }, 5000);
  });
});

httpServer.listen(3001, () => {
  console.log("server running on port 3001");
});