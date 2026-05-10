require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= STATIC FILE ================= */
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTES LAMA ================= */
const routes = require("./src/routes");
const jenisBencanaRoutes = require("./src/routes/jenis_bencana");
const namaBencanaRoutes = require("./src/routes/nama_bencana");
const { startTikTokScheduler } = require("./src/jobs/tiktokScheduler");
const { startXScheduler } = require("./src/jobs/xScheduler");
const { startBmkgScheduler } = require("./src/jobs/bmkgScheduler");
const logAktivitasRoutes = require("./src/routes/logAktivitasRoutes");

app.use("/", routes);
app.use("/jenis-bencana", jenisBencanaRoutes);
app.use("/nama-bencana", namaBencanaRoutes);
app.use("/log-aktivitas", logAktivitasRoutes);

// folder upload image
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* ================= ROUTES HUMINT ================= */
const humintLaporanRoutes = require("./src/routes/humint/laporan");
const detailLaporanRoutes = require("./src/routes/humint/detail_laporan");
const editLaporanRoutes = require("./src/routes/humint/edit_laporan");

app.use("/api/humint", humintLaporanRoutes);
app.use("/api/humint", detailLaporanRoutes);
app.use("/api/humint", editLaporanRoutes);


/* ================= SERVER ================= */
app.listen(5555, () => {
  console.log("server run on port 5555");
  // startTikTokScheduler();
  startXScheduler();
  startBmkgScheduler();
  console.log("server run on http://localhost:5555");
});
