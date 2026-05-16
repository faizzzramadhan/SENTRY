const express = require("express");
const router = express.Router();

const userRoutes = require("./user");
const osintRoutes = require("./osint");
const jenisBencanaRoutes = require("./jenis_bencana");
const namaBencanaRoutes = require("./nama_bencana");

const humintRoutes = require("./humint/laporan");
const adminHumintRoutes = require("./humint/admin_laporan");
const userHumintRoutes = require("./humint/user_laporan");
const editLaporanRoutes = require("./humint/edit_laporan");
const detailLaporanRoutes = require("./humint/detail_laporan");
const downloadPdfRoutes = require("./humint/download_pdf");
const rekapPdfRoutes = require("./humint/rekap_pdf");
const logAktivitasRoutes = require("./logAktivitasRoutes");

const dataKelurahanRoutes = require("./data_kelurahan");
const dataKecamatanRoutes = require("./data_kecamatan");
const jenisBencanaRoutes = require("./jenis_bencana");
const namaBencanaRoutes = require("./nama_bencana");

router.use("/user", userRoutes);
router.use("/osint", osintRoutes);
router.use("/log-aktivitas", logAktivitasRoutes);

router.use("/jenis-bencana", jenisBencanaRoutes);
router.use("/nama-bencana", namaBencanaRoutes);
router.use("/humint/jenis-bencana", jenisBencanaRoutes);
router.use("/humint/nama-bencana", namaBencanaRoutes);

router.use("/humint", rekapPdfRoutes);
router.use("/humint", downloadPdfRoutes);
router.use("/humint", detailLaporanRoutes);
router.use("/humint", editLaporanRoutes);
router.use("/humint", humintRoutes);

router.use("/humint/admin", adminHumintRoutes);
router.use("/humint/user", userHumintRoutes);

router.use("/kelurahan", dataKelurahanRoutes);
router.use("/kecamatan", dataKecamatanRoutes);
router.use("/jenis-bencana", jenisBencanaRoutes);
router.use("/nama-bencana", namaBencanaRoutes);

module.exports = router;
