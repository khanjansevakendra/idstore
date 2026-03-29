const { generatePdfPreview } = require("../services/pdfPreviewService");

async function createPreview(req, res) {
  try {
    const { filePath, password } = req.body;

    if (!filePath) {
      return res.status(400).json({ error: "filePath is required." });
    }

    const preview = await generatePdfPreview(filePath, password);
    return res.json(preview);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Preview generation failed." });
  }
}

module.exports = {
  createPreview
};
