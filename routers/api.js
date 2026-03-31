const express = require("express");
const { log } = require("node:console");
const router = express.Router();
// import { GoogleGenAI } from "@google/genai";
const { GoogleGenAI } = require("@google/genai");


router.post("/chat", async (req, res) => {
    const { message, history } = req.body;
    console.log(process.env.GEMINI_API_KEY);
    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });
    try {

        const contents = [
            ...history,
            {
                role: "user",
                parts: [{ text: message }]
            }
        ];

        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: message,
        });

        const reply = response.candidates[0].content.parts[0].text;

        res.json({ reply });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Something went wrong" });
    }

});

module.exports = router;