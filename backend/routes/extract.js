const express = require("express");
const extractController = require("../controllers/extractController");

const router = express.Router();

router.post("/", extractController.extractData);

module.exports = router;
