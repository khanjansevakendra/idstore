const fs = require("fs");
const path = require("path");
const { unlockPdfIfNeeded } = require("../services/pdfUnlockService");
const { parseDocument } = require("../services/pdfParserService");
const { extractPhoto } = require("../services/photoExtractor");

async function extractData(req, res) {
  try {
    const { service, filePath, password } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: "filePath is required." });
    }

    const rawPassword = typeof password === "string" ? password : "";
    const unlockedPath = await unlockPdfIfNeeded(filePath, rawPassword);
    const parsedFields = await parseDocument(unlockedPath, service, rawPassword);
    const photo = await extractPhoto(unlockedPath, rawPassword);

    const payload = {
      service,
      filePath: unlockedPath,
      extractedAt: new Date().toISOString(),
      fields: {
        ...parsedFields,
        photo
      }
    };

    const storagePath = path.join(
      __dirname,
      "..",
      "storage/extracted_data",
      `${path.basename(unlockedPath)}.json`
    );

    fs.writeFileSync(storagePath, JSON.stringify(payload, null, 2));

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Extraction failed." });
  }
}

module.exports = {
  extractData
};
