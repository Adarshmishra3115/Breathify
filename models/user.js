const { randomBytes, createHmac } = require("crypto");
const { Schema, model } = require("mongoose");


const userSchema = new Schema({
    fullName: {
        type: String,
        required: true,

    },
    age: {
        type: Number,
        required: true,
    },
    gender: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,

    },
    salt: {
        type: String,
    },

}, { timestamps: true });

userSchema.pre("save", async function() {
    const user = this;

    if (!user.isModified("password")) return;
    const salt = randomBytes(16).toString();
    const hashedPassword = createHmac("sha256", salt).update(user.password).digest("hex");

    this.salt = salt;
    this.password = hashedPassword;

    // next();

});

const User = model("user", userSchema);
module.exports = User;