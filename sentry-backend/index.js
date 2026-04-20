const express = require('express');
const cors  = require('cors');

const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const routes = require("./src/routes");
app.use("/", routes);

app.use(express.static(__dirname));

app.listen(5555, () => {
  console.log("server run on port 5555");
});