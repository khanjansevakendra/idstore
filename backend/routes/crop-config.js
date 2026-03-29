const express = require("express");
const cropConfigController = require("../controllers/cropConfigController");

const router = express.Router();

router.get("/:service", cropConfigController.getCropConfig);
router.post("/", cropConfigController.saveCropConfig);
router.delete("/:service", cropConfigController.deleteCropConfig);

module.exports = router;
