const { Router } = require("express");
const router = Router();
const User = require("../models/user");
const { createHmac } = require("crypto");
const { createTokenForUser, validateToken } = require("../services/authentication");
const questions = require("../data/question");

router.get("/quiz", (req, res) => {
    return res.render("quiz", {
        title: "Quiz Page",
        questions: questions
    });
});

router.get("/bot", (req, res) => {
    return res.render("bot", {
        title: "BOT",
    });
});

router.get("/map", (req, res) => {
    res.render("map", {
        title: "HealthCare Center"
    });
});

router.get("/therapy", (req, res) => {
    res.render("therapy", {
        title: "Therapy"
    });
});




router.post("/quiz", (req, res) => {
    let score = 0;

    for (let key in req.body) {
        score += Number(req.body[key]);
    }

    let result = "";

    if (score <= 15) result = "Low Stress 😊";
    else if (score <= 30) result = "Moderate Stress 😐";
    else result = "High Stress 😟";

    res.render("result", { score, result, title: "Result" });
});



module.exports = router;