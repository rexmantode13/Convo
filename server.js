const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = new Map();
const conversations = {};

app.use(express.static(path.join(__dirname, "public")));
app.get("/health", (_req, res) => res.status(200).send("ok"));

function listUsers() {
  return [...users.values()].map((u) => ({ id: u.id, name: u.name }));
}

function pairKey(a, b) {
  return [a, b].sort().join("|");
}

function getConv(a, b) {
  const key = pairKey(a, b);
  if (!conversations[key]) conversations[key] = { messages: [], unread: {} };
  return conversations[key];
}

function isStr(v) {
  return typeof v === "string";
}

function wrap(fn) {
  return (...args) => {
    try {
      fn(...args);
    } catch (err) {
      console.error(err);
    }
  };
}

io.on("connection", (socket) => {
  socket.on(
    "register",
    wrap((name, ack) => {
      const reply = (payload) => {
        if (typeof ack === "function") ack(payload);
      };
      if (!isStr(name)) return reply({ ok: false, error: "Enter a name" });
      const trimmed = name.trim();
      if (trimmed.length < 2 || trimmed.length > 20) {
        return reply({ ok: false, error: "Name must be 2–20 characters" });
      }
      if (users.has(socket.id)) {
        return reply({ ok: false, error: "Already registered" });
      }
      const taken = [...users.values()].some(
        (u) => u.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (taken) return reply({ ok: false, error: "That name is taken" });
      const me = { id: socket.id, name: trimmed };
      users.set(socket.id, me);
      reply({ ok: true, me });
      io.emit("users", listUsers());
    })
  );

  socket.on(
    "get_users",
    wrap((ack) => {
      const list = listUsers();
      if (typeof ack === "function") ack(list);
      else socket.emit("users", list);
    })
  );

  socket.on(
    "private_message",
    wrap((payload) => {
      const me = users.get(socket.id);
      if (!me || !payload || typeof payload !== "object") return;
      const to = payload.to;
      const text = payload.text;
      if (!isStr(to) || !isStr(text)) return;
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > 1000) return;
      if (!users.has(to) || to === socket.id) return;
      const conv = getConv(socket.id, to);
      const msg = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        from: socket.id,
        to,
        text: trimmed,
        timestamp: Date.now(),
      };
      conv.messages.push(msg);
      while (conv.messages.length > 100) conv.messages.shift();
      conv.unread[to] = (conv.unread[to] || 0) + 1;
      socket.emit("private_message", msg);
      io.to(to).emit("private_message", msg);
    })
  );

  socket.on(
    "get_messages",
    wrap((otherId, ack) => {
      const me = users.get(socket.id);
      const reply = (v) => {
        if (typeof ack === "function") ack(v);
      };
      if (!me || !isStr(otherId)) return reply([]);
      const conv = conversations[pairKey(socket.id, otherId)];
      reply(conv ? conv.messages : []);
    })
  );

  socket.on(
    "typing",
    wrap((payload) => {
      if (!users.get(socket.id) || !payload || !isStr(payload.to)) return;
      if (!users.has(payload.to)) return;
      io.to(payload.to).emit("typing", { from: socket.id });
    })
  );

  socket.on(
    "stop_typing",
    wrap((payload) => {
      if (!users.get(socket.id) || !payload || !isStr(payload.to)) return;
      if (!users.has(payload.to)) return;
      io.to(payload.to).emit("stop_typing", { from: socket.id });
    })
  );

  socket.on(
    "mark_read",
    wrap((payload) => {
      const me = users.get(socket.id);
      if (!me || !payload || !isStr(payload.from)) return;
      const conv = conversations[pairKey(socket.id, payload.from)];
      if (conv) conv.unread[socket.id] = 0;
    })
  );

  socket.on(
    "disconnect",
    wrap(() => {
      const me = users.get(socket.id);
      if (!me) return;
      users.delete(socket.id);
      for (const key of Object.keys(conversations)) {
        const parts = key.split("|");
        if (parts.includes(socket.id)) delete conversations[key];
      }
      io.emit("users", listUsers());
      io.emit("user_left", { id: me.id, name: me.name });
    })
  );
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Convo listening on ${PORT}`);
});
