const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");
const requireRole = require("../../middlewares/requireRole");
const { runTikTokCrawler } = require("../../services/tiktok/tiktokCrawler");

router.post("/run", auth, requireRole("staff"), async (req, res) => {
  try {
    const result = await runTikTokCrawler({ manual: true });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

module.exports = router;