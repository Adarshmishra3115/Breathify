require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const userRouter = require("./routers/user");
const boxRouter = require("./routers/box");
const botRouter = require("./routers/api");
const ytRouter = require("./routers/yt_router");
const { checkForCookieAuthentication, isLoggedIn } = require("./middleware/authentication");

const path = require("path");

mongoose.connect("mongodb://127.0.0.1:27017/breathify")
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

const app = express();

app.set("view engine", "ejs");
app.set("views", path.resolve("./views"));

app.use(express.static(path.resolve("./public")));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/* 🔥 1. Decode token */
app.use(checkForCookieAuthentication("token"));


/* Routes */
app.use("/user", userRouter);
app.use("/box", isLoggedIn, boxRouter);
app.use("/bot", botRouter);
app.use("/yt", ytRouter);


app.get("/", (req, res) => {
    res.render("home", { title: "Breathify" }); // ✅ no user needed
});

/* 🔥 3. Listen LAST */
app.listen(5000, () => {
    console.log("Server running on port 5000");
});