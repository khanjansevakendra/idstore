const fs = require("fs");
const path = require("path");

function cropConfigPath(service) {
  return path.join(__dirname, "..", "storage/crop_configs", `${service}.json`);
}

function loadCropConfig(service) {
  const target = cropConfigPath(service);

  if (!fs.existsSync(target)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(target, "utf-8"));
}

function saveCropConfigFile(service, config) {
  const target = cropConfigPath(service);
  const payload = {
    ...config,
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(target, JSON.stringify(payload, null, 2));
  return payload;
}

function deleteCropConfigFile(service) {
  const target = cropConfigPath(service);

  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }
}

module.exports = {
  loadCropConfig,
  saveCropConfigFile,
  deleteCropConfigFile
};
