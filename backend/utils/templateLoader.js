const fs = require("fs");
const path = require("path");

const FALLBACK_FIELDS = {
  name: { x: 220, y: 160 },
  dob: { x: 220, y: 190 },
  gender: { x: 220, y: 220 },
  id_number: { x: 220, y: 250 },
  address: { x: 220, y: 280 },
  photo: { x: 50, y: 120 }
};

function resolveTemplateFolder(service) {
  const normalized = (service || "").toLowerCase();

  if (normalized.startsWith("aadhaar")) {
    if (normalized.startsWith("aadhaar-sample")) {
      return "other_cards";
    }
    return "aadhaar";
  }
  if (normalized.startsWith("pancard")) {
    return "pancard";
  }
  if (normalized.startsWith("voter")) {
    return "voter";
  }
  if (normalized.startsWith("driving")) {
    return "driving";
  }
  if (
    normalized.startsWith("student-id") ||
    normalized.startsWith("custom-identity")
  ) {
    return "other_cards";
  }

  return "other_cards";
}

function loadTemplate(service) {
  const folder = resolveTemplateFolder(service);
  const basePath = path.join(__dirname, "..", "..", "templates", folder);
  const fieldsPath = path.join(basePath, "fields.json");
  const fieldMappings = fs.existsSync(fieldsPath)
    ? JSON.parse(fs.readFileSync(fieldsPath, "utf-8"))
    : FALLBACK_FIELDS;

  return {
    front: path.join(basePath, "front.png"),
    back: path.join(basePath, "back.png"),
    fields: fieldMappings
  };
}

module.exports = {
  loadTemplate
};
