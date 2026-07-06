const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const pty = require("node-pty");
const crypto = require("crypto");
const Docker = require("dockerode");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "http://localhost:3000" },
});

const docker = new Docker(); // connects to Docker Desktop automatically
const sessions = {};

// helper — spin up a container and return it
async function createContainer() {
  const container = await docker.createContainer({
    Image: "node:alpine",       // lightweight linux + node
    Cmd: ["/bin/sh"],           // start a shell
    Tty: true,                  // needed for pty to work
    OpenStdin: true,            // keep stdin open so shell stays alive
    AttachStdin: true,
    AttachStdout: true,
    AttachStderr: true,
  });
  await container.start();
  return container;
}

io.on("connection", (socket) => {
  console.log("user connected:", socket.id);

  socket.on("create session", async () => {
    try {
      const sessionId = crypto.randomBytes(4).toString("hex");
      const shell = process.platform === "win32" ? "powershell.exe" : "bash";

      // spin up a docker container for this session
      const container = await createContainer();
      console.log(`container started for session ${sessionId}`);

      // spawn pty inside the container using docker exec
      const ptyProcess = pty.spawn("docker", ["exec", "-it", container.id, "/bin/sh"], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env,
      });

      sessions[sessionId] = { pty: ptyProcess, container, users: [] };

      ptyProcess.onData((data) => {
        io.to(sessionId).emit("terminal output", data);
      });

      socket.join(sessionId);
      socket.sessionId = sessionId;
      sessions[sessionId].users.push(socket.id);

      io.to(sessionId).emit("user count", sessions[sessionId].users.length);
      socket.emit("session created", sessionId);
      console.log(`session created: ${sessionId}`);
    } catch (err) {
      console.error("failed to create session:", err.message);
      socket.emit("error", "failed to create session");
    }
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

    setTimeout(async () => {
      if (!sessions[sessionId]) return;
      if (sessions[sessionId].users.length === 0) {
        // kill pty
        if (process.platform !== "win32") {
          try { sessions[sessionId].pty.kill(); } catch (e) {}
        }
        // stop and remove the container
        try {
          await sessions[sessionId].container.stop();
          await sessions[sessionId].container.remove();
          console.log(`container removed for session ${sessionId}`);
        } catch (e) {
          console.log("container cleanup error:", e.message);
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