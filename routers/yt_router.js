const express = require("express");
const router = express.Router();

router.get("/search", async(req, res) => {
    const query = req.query.q;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!query) {
        return res.status(400).json({ error: "No query" });
    }

    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&key=${apiKey}&maxResults=1&type=video`
        );

        const data = await response.json();
        console.log("FULL RESPONSE:", data); // 🔥 ADD THIS

        const videoId = data.items[0].id.videoId;

        res.json({ videoId });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "API error" });
    }
});

module.exports = router;