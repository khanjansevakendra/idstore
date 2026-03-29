const express = require("express");
const path = require("path");
const fs = require("fs");

const router = express.Router();

router.get("/:fileName", (req, res) => {
  const targetPath = path.join(__dirname, "..", "storage/generated_cards", req.params.fileName);

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: "Generated file not found." });
  }

  return res.download(targetPath);
});

module.exports = router;
