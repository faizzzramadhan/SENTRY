const express = require("express");
const router = express.Router();

const dataKelurahanRoutes = require("../data_kelurahan");
const dataKecamatanRoutes = require("../data_kecamatan");
const dataKeywordRoutes = require("./data_keyword");
const osintKpiRoutes = require("./osint_kpi");
const tiktokCrawlerRoutes = require("./tiktok_crawler");
const xCrawlerRoutes = require("./x_crawler");
const bmkgRoutes = require("./bmkg");

router.use("/kelurahan", dataKelurahanRoutes);
router.use("/kecamatan", dataKecamatanRoutes);
router.use("/keyword", dataKeywordRoutes);
router.use("/kpi", osintKpiRoutes);
router.use("/tiktok-crawler", tiktokCrawlerRoutes);
router.use("/x-crawler", xCrawlerRoutes);
router.use("/bmkg", bmkgRoutes);

module.exports = router;