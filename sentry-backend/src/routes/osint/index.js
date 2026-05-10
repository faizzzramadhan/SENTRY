const express = require("express");
const router = express.Router();

const dataKeywordRoutes = require("./data_keyword");
const osintKpiRoutes = require("./osint_kpi");
const tiktokCrawlerRoutes = require("./tiktok_crawler");
const xCrawlerRoutes = require("./x_crawler");
const bmkgRoutes = require("./bmkg");
const osintDataRoutes = require("./osint_data");
const osintReferenceRoutes = require("./osint_reference");

router.use("/keyword", dataKeywordRoutes);
router.use("/kpi", osintKpiRoutes);
router.use("/tiktok-crawler", tiktokCrawlerRoutes);
router.use("/x-crawler", xCrawlerRoutes);
router.use("/bmkg", bmkgRoutes);
router.use("/data", osintDataRoutes);
router.use("/reference", osintReferenceRoutes);

module.exports = router;