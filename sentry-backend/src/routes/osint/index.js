const express = require("express");
const router = express.Router();

const dataKelurahanRoutes = require("./data_kelurahan");
const dataKecamatanRoutes = require("./data_kecamatan");
const dataKeywordRoutes = require("./data_keyword");
const osintSettingsRoutes = require("./osint_settings");

router.use("/kelurahan", dataKelurahanRoutes);
router.use("/kecamatan", dataKecamatanRoutes);
router.use("/keyword", dataKeywordRoutes);
router.use("/settings", osintSettingsRoutes);

module.exports = router;