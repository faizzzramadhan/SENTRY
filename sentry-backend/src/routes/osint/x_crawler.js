const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");
const requireRole = require("../../middlewares/requireRole");
const { runXCrawler } = require("../../services/x/xCrawler");

router.post("/run", auth, requireRole("staff", "admin"), async (req, res) => {
  try {
    const includeRecords =
      req.query.preview === "1" || req.query.mode === "preview";

    const insertMode =
      req.query.insertMode === "all_records" || req.query.insertMode === "dedup"
        ? req.query.insertMode
        : undefined;

    const result = await runXCrawler({
      manual: true,
      includeRecords,
      insertMode,
    });

    return res.json(result);
  } catch (error) {
    console.error("[x-crawler-route] error:", error);

    return res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});

module.exports = router;