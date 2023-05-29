require("dotenv").config();
const authenticateToken = require("./middleware/authenticateToken");
const express = require("express");
const db = require("./db/models");
const { Document } = require("./db/models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const app = express();
const { login, register } = require("./controllers/auth");
const documentRouter = require("./routes/documentRouter");
const userRouter = require("./routes/userRouter");
const folderRouter = require("./routes/folderRouter");
const authRouter = require("./routes/authRouter");
const documentAccessRouter = require("./routes/UserDocumentAccessRouter");
const folderAccessRouter = require("./routes/UserFolderAccessRouter");
const cookieParser = require("cookie-parser");
const { getAccessType } = require("./controllers/UserDocumentAccess");
const { findDocument } = require("./controllers/document");
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const path = require("path");
const _dirname = path.dirname("");
const buildPath = path.join(_dirname, "../frontend/my-react-app/dist");

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
app.use(cookieParser());
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
let documentToUsers = {};
app.use(express.json());
io.on("connection", (socket) => {
  socket.on("get-document", async (documentId, username) => {
    console.count("connect ran");
    socket.username = username;
    if (documentToUsers[documentId]) {
      documentToUsers[documentId].add(username);
    } else {
      documentToUsers[documentId] = new Set([username]);
    }
    const document = await findDocument(documentId, username);
    const accessType = await getAccessType(documentId, username);
    socket.emit(
      "load-document",
      document.data,
      document.text,
      document.parent,
      accessType
    );
  });
  socket.on("join-document", (documentId) => {
    socket.join(documentId);
    socket.lastDocument = documentId;
    io.to(documentId).emit("users", [...documentToUsers[documentId]]);
  });
  socket.on("disconnect", () => {
    console.count("disconnect ran");
    if (documentToUsers[socket.lastDocument].has(socket.username)) {
      documentToUsers[socket.lastDocument].delete(socket.username);
    }
    io.to(socket.lastDocument).emit("users", [
      ...documentToUsers[socket.lastDocument],
    ]);
  });
  socket.on("send-changes", (delta, documentId) => {
    socket.broadcast.to(documentId).emit("receive-changes", delta);
  });
  socket.on("save-document", async (document, documentId) => {
    await Document.update({ data: document }, { where: { id: documentId } });
    io.to(documentId).emit("document-saved", "All changes saved!");
  });
  socket.on("switch-document", (oldDocumentId, newDocumentId, username) => {
    // Leave the old room
    socket.leave(oldDocumentId);
    // Remove the user from the old room's user list
    if (documentToUsers[oldDocumentId]) {
      documentToUsers[oldDocumentId].delete(username);
      io.to(oldDocumentId).emit("users", [...documentToUsers[oldDocumentId]]);
    }
    // Join the new room
    socket.join(newDocumentId);
    socket.lastDocument = newDocumentId;
    // Add the user to the new room's user list
    if (documentToUsers[newDocumentId]) {
      documentToUsers[newDocumentId].add(username);
    } else {
      documentToUsers[newDocumentId] = new Set([username]);
    }
    // Emit the updated user list for the new room
    io.to(newDocumentId).emit("users", [...documentToUsers[newDocumentId]]);
  });
});

app.use("/api/", authRouter);
app.use("/api/documents", authenticateToken, documentRouter);
app.use("/api/users", authenticateToken, userRouter);
app.use("/api/folders", authenticateToken, folderRouter);
app.use("/api/folderAccess", authenticateToken, folderAccessRouter);
app.use("/api/documentAccess", authenticateToken, documentAccessRouter);
app.use(express.static(buildPath));

app.get("/*", function (req, res) {
  res.sendFile(
    path.join(__dirname, "../frontend/my-react-app/dist/index.html"),
    function (err) {
      if (err) {
        res.status(500).send(err);
      }
    }
  );
});

const port =
  process.env.NODE_ENV === "production"
    ? process.env.PROD_PORT
    : process.env.PORT;

server.listen(port, () => console.log(`server running on port ${port}`));
