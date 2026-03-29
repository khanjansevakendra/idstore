const express = require("express");
const cardController = require("../controllers/cardController");

const router = express.Router();

router.post("/", cardController.generateCard);

module.exports = router;
