const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    lastMessage: {
        type: String,
        trim: true
    },

    lastMessageTime: {
        type: Date,
        default: Date.now
    },

    unreadCount: {
        type: Number,
        default: 0
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Conversation", conversationSchema);