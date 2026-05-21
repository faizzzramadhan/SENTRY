require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

/* ================= IMPORT ROUTES & JOBS ================= */
const routes = require("./src/routes");
const jenisBencanaRoutes = require("./src/routes/jenis_bencana");
const namaBencanaRoutes = require("./src/routes/nama_bencana");

const humintLaporanRoutes = require("./src/routes/humint/laporan");
const detailLaporanRoutes = require("./src/routes/humint/detail_laporan");
const editLaporanRoutes = require("./src/routes/humint/edit_laporan");

const { startTikTokScheduler } = require("./src/jobs/tiktokScheduler");
const { startXScheduler } = require("./src/jobs/xScheduler");
const { startBmkgScheduler } = require("./src/jobs/bmkgScheduler");

const { autoLogAktivitas } = require("./src/utils/activityLogger");

const humintMapRoute = require('./src/routes/geoint/humintMap')
const osintMapRoute = require('./src/routes/geoint/osintMap')
//const fusionMapRoute = require('./src/routes/geoint/fusionMap')
const riskMapRoute = require('./src/routes/geoint/riskMap')
const osintFeedRoute = require('./src/routes/geoint/osintFeed') 
const zonaRawanRoute = require('./src/routes/geoint/zonaRawan')

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

/* ================= ROUTES UTAMA ================= */
app.use("/", routes);

/*
  Route ini tetap dipasang di root karena frontend memakai:
  /jenis-bencana
  /nama-bencana
*/
app.use("/jenis-bencana", jenisBencanaRoutes);
app.use("/nama-bencana", namaBencanaRoutes);

/* ================= ROUTES HUMINT PUBLIC/API ================= */
app.use("/api/humint", humintLaporanRoutes);
app.use("/api/humint", detailLaporanRoutes);
app.use("/api/humint", editLaporanRoutes);


app.use('/api/geoint/humint', humintMapRoute)
app.use('/api/geoint/osint', osintMapRoute)
app.use('/api/geoint/humint-map', humintMapRoute)
app.use('/api/geoint/osint-map', osintMapRoute)
app.use('/api/geoint/osint-feed', osintFeedRoute)
//app.use('/api/geoint/fusion', fusionMapRoute)
app.use('/api/geoint/risk', riskMapRoute)
app.use('/api/geoint/zona-rawan',zonaRawanRoute)

/* ================= SERVER ================= */
app.listen(5555, () => {
  console.log("server run on port 5555");

  // startTikTokScheduler();
  startXScheduler();
  startBmkgScheduler();

  console.log("server run on http://localhost:5555");
});