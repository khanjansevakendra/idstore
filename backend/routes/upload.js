const express = require("express");
const multer = require("multer");
const path = require("path");
const { v4: uuid } = require("uuid");
const uploadController = require("../controllers/uploadController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, path.join(__dirname, "..", "storage/uploads"));
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    callback(null, `${uuid()}${extension}`);
  }
});

const upload = multer({ storage });

router.post(
  "/",
  upload.fields([
    { name: "document", maxCount: 1 },
    { name: "templateFront", maxCount: 1 },
    { name: "templateBack", maxCount: 1 }
  ]),
  uploadController.createUpload
);

module.exports = router;
