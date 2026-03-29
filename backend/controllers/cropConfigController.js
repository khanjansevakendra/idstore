const {
  loadCropConfig,
  saveCropConfigFile,
  deleteCropConfigFile
} = require("../services/cropConfigService");

async function getCropConfig(req, res) {
  try {
    const config = loadCropConfig(req.params.service);

    return res.json({
      service: req.params.service,
      config
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to load crop config." });
  }
}

async function saveCropConfig(req, res) {
  try {
    const { service, front, back, adjustments } = req.body;

    if (!service || !front || !back) {
      return res.status(400).json({ error: "service, front, and back are required." });
    }

    const saved = saveCropConfigFile(service, { front, back, adjustments });

    return res.status(201).json({
      service,
      config: saved
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to save crop config." });
  }
}

async function deleteCropConfig(req, res) {
  try {
    deleteCropConfigFile(req.params.service);

    return res.json({
      service: req.params.service,
      deleted: true
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Unable to delete crop config." });
  }
}

module.exports = {
  getCropConfig,
  saveCropConfig,
  deleteCropConfig
};
