const express = require("express");
const router = express.Router();
const { analyzeSensorData } = require("../services/geminiService");

// POST /api/ai/analyze
router.post("/analyze", async (req, res) => {
  try {
    const { temperature, humidity, moisture } = req.body;

    const analysis = await analyzeSensorData({
      temperature,
      humidity,
      moisture,
    });

    res.json({ analysis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI analysis failed" });
  }
});

module.exports = router;