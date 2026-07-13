require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const db = require("./src/models");
const { sequelize } = db;

/* ================= IMPORT ROUTES & JOBS ================= */
const routes = require("./src/routes");

const humintLaporanRoutes = require("./src/routes/humint/laporan");
const detailLaporanRoutes = require("./src/routes/humint/detail_laporan");
const editLaporanRoutes = require("./src/routes/humint/edit_laporan");

const { startTikTokScheduler } = require("./src/jobs/tiktokScheduler");
const { startXScheduler } = require("./src/jobs/xScheduler");
const { startBmkgScheduler } = require("./src/jobs/bmkgScheduler");
const { startOsintDataScheduler } = require("./src/jobs/osintDataScheduler");

const { autoLogAktivitas } = require("./src/utils/activityLogger");

const humintMapRoute = require("./src/routes/geoint/humintMap");
const osintMapRoute = require("./src/routes/geoint/osintMap");
// const fusionMapRoute = require("./src/routes/geoint/fusionMap");
const riskMapRoute = require("./src/routes/geoint/riskMap");
const osintFeedRoute = require("./src/routes/geoint/osintFeed");
const zonaRawanRoute = require("./src/routes/geoint/zonaRawan");

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= STATIC FILE ================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= AUTO LOG AKTIVITAS ================= */
app.use(
  autoLogAktivitas({
    logGet: true,
    logSuccess: true,
    logFailed: true,
  })
);

/* ================= PUBLIC MASTER DATA FOR SENTRY USER ================= */
/*
  Endpoint ini dibuat khusus agar sentry-user bisa mengambil master data
  tanpa terkena proteksi route admin.
*/

app.get("/api/jenis-bencana", async (req, res) => {
  try {
    const data = await sequelize.query(
      `
      SELECT *
      FROM jenis_bencana
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("PUBLIC JENIS BENCANA ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data jenis bencana",
    });
  }
});

app.get("/api/nama-bencana", async (req, res) => {
  try {
    const { jenis_id } = req.query;

    const rawData = await sequelize.query(
      `
      SELECT *
      FROM nama_bencana
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const data = jenis_id
      ? rawData.filter((item) => {
          return (
            String(item.jenis_id) === String(jenis_id) ||
            String(item.id_jenis) === String(jenis_id)
          );
        })
      : rawData;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("PUBLIC NAMA BENCANA ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data nama bencana",
    });
  }
});

app.get("/api/data-kecamatan", async (req, res) => {
  try {
    const data = await sequelize.query(
      `
      SELECT *
      FROM data_kecamatan
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("PUBLIC DATA KECAMATAN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data kecamatan",
    });
  }
});

app.get("/api/data-kelurahan", async (req, res) => {
  try {
    const { kecamatan_id, id_kecamatan } = req.query;

    const selectedKecamatan =
      kecamatan_id || id_kecamatan || "";

    const rawData = await sequelize.query(
      `
      SELECT *
      FROM data_kelurahan
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    const data = selectedKecamatan
      ? rawData.filter((item) => {
          return (
            String(item.kecamatan_id) === String(selectedKecamatan) ||
            String(item.id_kecamatan) === String(selectedKecamatan)
          );
        })
      : rawData;

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("PUBLIC DATA KELURAHAN ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data kelurahan",
    });
  }
});

/* ================= ROUTES UTAMA ================= */
app.use("/", routes);

/* ================= ROUTES HUMINT PUBLIC/API ================= */
app.use("/api/humint", humintLaporanRoutes);
app.use("/api/humint", detailLaporanRoutes);
app.use("/api/humint", editLaporanRoutes);

/* ================= ROUTES GEOINT ================= */
app.use("/api/geoint/humint", humintMapRoute);
app.use("/api/geoint/osint", osintMapRoute);
app.use("/api/geoint/humint-map", humintMapRoute);
app.use("/api/geoint/osint-map", osintMapRoute);
app.use("/api/geoint/osint-feed", osintFeedRoute);
// app.use("/api/geoint/fusion", fusionMapRoute);
app.use("/api/geoint/risk", riskMapRoute);
app.use("/api/geoint/zona-rawan", zonaRawanRoute);

/* ================= SERVER ================= */
app.listen(5555, () => {
  console.log("server run on port 5555");

  startXScheduler();
  startBmkgScheduler();
  startOsintDataScheduler();

  console.log("server run on http://localhost:5555");
});