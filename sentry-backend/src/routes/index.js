const express = require("express");
const router = express.Router();

const userRoutes = require("./user");
const osintRoutes = require("./osint");

router.use("/user", userRoutes);
router.use("/osint", osintRoutes);

module.exports = router;