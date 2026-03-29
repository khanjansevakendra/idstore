const express = require("express");
const pdfPreviewController = require("../controllers/pdfPreviewController");

const router = express.Router();

router.post("/", pdfPreviewController.createPreview);

module.exports = router;
