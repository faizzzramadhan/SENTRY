const express = require('express');
const cors  = require('cors');

const app = express();
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// endpoint admin
const admin = require('./src/routes/admin');
app.use("/admin", admin)

app.use(express.static(__dirname))

app.listen(5555, () => {
    console.log("server run on port 5555");
})