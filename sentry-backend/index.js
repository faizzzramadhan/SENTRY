require("dotenv").config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const routes = require("./src/routes");
const jenisBencanaRoutes = require("./src/routes/jenis_bencana");
const namaBencanaRoutes = require("./src/routes/nama_bencana");
const { startTikTokScheduler } = require("./src/jobs/tiktokScheduler");
const { startXScheduler } = require("./src/jobs/xScheduler");
const { startBmkgScheduler } = require("./src/jobs/bmkgScheduler");
app.use("/", routes);
app.use("/jenis-bencana", jenisBencanaRoutes);
app.use("/nama-bencana", namaBencanaRoutes);

// folder upload image
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(5555, () => {
  console.log("server run on port 5555");
  // startTikTokScheduler();
  startXScheduler();
  startBmkgScheduler();
});