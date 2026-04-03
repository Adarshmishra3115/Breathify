require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

const http = require("http");
const { Server } = require("socket.io");

const userRouter  = require("./routers/user");
const boxRouter   = require("./routers/box");
const botRouter   = require("./routers/api");
const ytRouter    = require("./routers/yt_router");
const chatRouter  = require("./routers/chat");
const overcameRouter = require("./routers/overcame");

const { checkForCookieAuthentication, isLoggedIn } = require("./middleware/authentication");

const Message      = require("./models/Message");
const Conversation = require("./models/conversation");

const path = require("path");

mongoose.connect("mongodb://127.0.0.1:27017/breathify")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

const app = express();

// ── Create server + io BEFORE routes so req.app.get("io") always works ──
const server = http.createServer(app);
const io     = new Server(server);
app.set("io", io);

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.static(path.resolve("./public")));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(checkForCookieAuthentication("token"));

/* ── Routes ─────────────────────────────────────────────── */
app.use("/user",  userRouter);
app.use("/box",   isLoggedIn, boxRouter);
app.use("/bot",   botRouter);
app.use("/yt",    ytRouter);
app.use("/chat",  chatRouter);
app.use("/overcame" , overcameRouter);

app.get("/", (req, res) => {
    res.render("home", { title: "Breathify" });
});

/* ── Socket.io ───────────────────────────────────────────── */
io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    /*
     * JOIN
     * Payload: { userId, userName, role, partnerId }
     *   userId    → logged-in user's _id (string)
     *   userName  → logged-in user's fullName
     *   role      → "user" | "admin"
     *   partnerId → the other person's _id
     *
     * Each socket joins:
     *   1. Their own personal room  → used by io.to(receiverId)
     *   2. Shared conversation room → both sides receive live messages
     */
    socket.on("join", ({ userId, userName, role, partnerId }) => {

        socket.join(userId.toString());

        if (role === "admin") socket.join("admin");

        if (partnerId) {
            const roomId = role === "user"
                ? `conv_u${userId}_a${partnerId}`
                : `conv_u${partnerId}_a${userId}`;

            socket.join(roomId);
            socket.currentRoom = roomId;
        }

        socket.userId   = userId.toString();
        socket.userName = userName;
        socket.userRole = role;

        console.log(`[${role}] ${userName} joined — socket: ${socket.id}`);
    });

    /*
     * SEND MESSAGE
     * Payload: { receiverId, message }
     * Saves to MongoDB → updates Conversation → emits to shared room
     */
    socket.on("send_message", async ({ receiverId, message }) => {
        try {
            if (!message || !message.trim()) return;

            const senderId   = socket.userId;
            const senderRole = socket.userRole;
            if (!senderId) return;

            let userId, adminId;
            if (senderRole === "user") {
                userId  = senderId;
                adminId = receiverId;
            } else {
                userId  = receiverId;
                adminId = senderId;
            }

            // Save to DB
            const newMessage = await Message.create({
                senderId,
                receiverId,
                message: message.trim()
            });

            // Upsert conversation metadata
            await Conversation.findOneAndUpdate(
                { userId, adminId },
                {
                    lastMessage:     message.trim(),
                    lastMessageTime: new Date(),
                    $inc: { unreadCount: senderRole === "user" ? 1 : 0 }
                },
                { upsert: true, returnDocument: 'after'}
            );

            const payload = {
                _id:       newMessage._id,
                senderId:  { _id: senderId, fullName: socket.userName, role: senderRole },
                receiverId,
                message:   message.trim(),
                seen:      false,
                createdAt: newMessage.createdAt
            };

            // Emit to shared room — both user + admin receive it instantly
            const roomId = senderRole === "user"
                ? `conv_u${userId}_a${adminId}`
                : `conv_u${userId}_a${adminId}`;

            io.to(roomId).emit("receiveMessage", payload);

        } catch (err) {
            console.error("Socket send_message error:", err);
        }
    });

    socket.on("disconnect", () => {
        console.log("Socket disconnected:", socket.id);
    });
});

/* ── Start ───────────────────────────────────────────────── */
server.listen(5000, () => {
    console.log("Server running on http://localhost:5000");
});