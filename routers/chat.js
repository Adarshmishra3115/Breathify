const express = require("express");
const router = express.Router();

const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const User = require("../models/user");
const { isLoggedIn } = require("../middleware/authentication");

/* =======================================================
   📜 USER CHAT PAGE
   Route: GET /chat/user_chat
   - Shows all admins in sidebar
   - If ?with=adminId, loads that conversation
======================================================= */
router.get("/user_chat", isLoggedIn, async (req, res) => {
    try {
        if (req.user.role !== "user") return res.redirect("/chat/admin_chat");

        // All admins for sidebar
        const admins = await User.find({ role: "admin" }).select("fullName email");

        // Which admin is selected (from query param)
        const selectedAdminId = req.query.with || (admins[0] ? admins[0]._id : null);
        const selectedAdmin = admins.find(a => a._id.toString() === (selectedAdminId ? selectedAdminId.toString() : "")) || admins[0] || null;

        // Load existing messages for this pair
        let messages = [];
        if (selectedAdmin) {
            messages = await Message.find({
                $or: [
                    { senderId: req.user._id, receiverId: selectedAdmin._id },
                    { senderId: selectedAdmin._id, receiverId: req.user._id }
                ]
            })
            .sort({ createdAt: 1 })
            .populate("senderId", "fullName role");

            // Mark messages from admin as seen
            await Message.updateMany(
                { senderId: selectedAdmin._id, receiverId: req.user._id, seen: false },
                { seen: true }
            );

            // Reset unread count
            await Conversation.updateOne(
                { userId: req.user._id, adminId: selectedAdmin._id },
                { unreadCount: 0 }
            );
        }

        res.render("user-chat", {
            title: "Chat",
            currentUser: req.user,
            admins,
            selectedAdmin: selectedAdmin || null,
            messages
        });

    } catch (err) {
        console.error("User Chat Page Error:", err);
        res.status(500).send("Failed to load chat page");
    }
});

/* =======================================================
   📜 ADMIN CHAT PAGE
   Route: GET /chat/admin_chat
   - Shows all users in sidebar
   - If ?with=userId, loads that conversation
======================================================= */
router.get("/admin_chat", isLoggedIn, async (req, res) => {
    try {
        if (req.user.role !== "admin") return res.redirect("/chat/user_chat");

        // All users for sidebar
        const users = await User.find({ role: "user" }).select("fullName email");

        // Which user is selected
        const selectedUserId = req.query.with || (users[0] ? users[0]._id : null);
        const selectedUser = users.find(u => u._id.toString() === (selectedUserId ? selectedUserId.toString() : "")) || users[0] || null;

        // Load existing messages for this pair
        let messages = [];
        if (selectedUser) {
            messages = await Message.find({
                $or: [
                    { senderId: req.user._id, receiverId: selectedUser._id },
                    { senderId: selectedUser._id, receiverId: req.user._id }
                ]
            })
            .sort({ createdAt: 1 })
            .populate("senderId", "fullName role");

            // Mark messages from user as seen
            await Message.updateMany(
                { senderId: selectedUser._id, receiverId: req.user._id, seen: false },
                { seen: true }
            );

            // Reset unread count
            await Conversation.updateOne(
                { userId: selectedUser._id, adminId: req.user._id },
                { unreadCount: 0 }
            );
        }

        res.render("admin-chat", {
            title: "Admin Chat",
            currentUser: req.user,
            users,
            selectedUser: selectedUser || null,
            messages
        });

    } catch (err) {
        console.error("Admin Chat Page Error:", err);
        res.status(500).send("Failed to load admin chat page");
    }
});

/* =======================================================
   📩 SEND MESSAGE (REST fallback — Socket.io is primary)
   Route: POST /chat/send
======================================================= */
router.post("/send", isLoggedIn, async (req, res) => {
    try {
        const { receiverId, message } = req.body;

        const senderId   = req.user._id;
        const senderRole = req.user.role;
        const io         = req.app.get("io");

        let userId, adminId;
        if (senderRole === "user") {
            userId  = senderId;
            adminId = receiverId;
        } else {
            userId  = receiverId;
            adminId = senderId;
        }

        // Save message to DB
        const newMessage = await Message.create({ senderId, receiverId, message });

        // Upsert conversation metadata
        await Conversation.findOneAndUpdate(
            { userId, adminId },
            {
                lastMessage: message,
                lastMessageTime: new Date(),
                $inc: { unreadCount: senderRole === "user" ? 1 : 0 }
            },
            { upsert: true, returnDocument: 'after'}
        );

        // Emit to receiver's personal room
        io.to(receiverId.toString()).emit("receiveMessage", {
            _id:        newMessage._id,
            senderId:   { _id: senderId, fullName: req.user.fullName, role: senderRole },
            receiverId,
            message,
            seen:       false,
            createdAt:  newMessage.createdAt
        });

        res.status(200).json(newMessage);

    } catch (err) {
        console.error("Send Message Error:", err);
        res.status(500).json({ error: "Failed to send message" });
    }
});

/* =======================================================
   📜 GET CHAT HISTORY (API)
   Route: GET /chat/:userId/:adminId
======================================================= */
router.get("/:userId/:adminId", isLoggedIn, async (req, res) => {
    try {
        const { userId, adminId } = req.params;

        const messages = await Message.find({
            $or: [
                { senderId: userId,   receiverId: adminId },
                { senderId: adminId,  receiverId: userId  }
            ]
        })
        .sort({ createdAt: 1 })
        .populate("senderId", "fullName role");

        res.status(200).json(messages);

    } catch (err) {
        console.error("Fetch Chat Error:", err);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

/* =======================================================
   👁️ MARK AS SEEN
   Route: POST /chat/seen
======================================================= */
router.post("/seen", isLoggedIn, async (req, res) => {
    try {
        const { userId, adminId } = req.body;

        await Message.updateMany(
            { senderId: userId, receiverId: adminId, seen: false },
            { seen: true }
        );

        await Conversation.updateOne(
            { userId, adminId },
            { unreadCount: 0 }
        );

        res.status(200).json({ message: "Marked as seen" });

    } catch (err) {
        console.error("Seen Error:", err);
        res.status(500).json({ error: "Failed to update seen status" });
    }
});

module.exports = router;