const express = require('express');
const cors  = require('cors');

const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const routes = require("./src/routes");
const jenisBencanaRoutes = require("./src/routes/jenis_bencana");
const namaBencanaRoutes = require("./src/routes/nama_bencana");
app.use("/", routes);
app.use("/jenis-bencana", jenisBencanaRoutes);
app.use("/nama-bencana", namaBencanaRoutes);

app.use(express.static(__dirname));

app.listen(5555, () => {
  console.log("server run on port 5555");
});