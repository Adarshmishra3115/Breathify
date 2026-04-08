const express = require("express");
const router = express.Router();

router.get("/search", async(req, res) => {
    const query = req.query.q;
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (!query) {
        return res.status(400).json({ error: "No query" });
    }

    try {
        const musicQuery = `${query} official audio song`;

        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet` +
            `&q=${encodeURIComponent(musicQuery)}` +
            `&key=${apiKey}` +
            `&maxResults=1` +
            `&type=video` +
            `&videoCategoryId=10` +
            `&topicId=/m/04rlf` +
            `&videoDuration=medium`
        );

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            return res.status(404).json({ error: "No music found" });
        }

        res.json({ videoId: data.items[0].id.videoId });

    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "API error" });
    }
});

module.exports = router;