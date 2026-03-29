const { renderCard } = require("../services/cardRenderEngine");

async function generateCard(req, res) {
  try {
    const {
      service,
      fields,
      templatePath,
      backTemplatePath,
      sourceFilePath,
      password
    } = req.body;

    if (!service || !fields) {
      return res.status(400).json({ error: "service and fields are required." });
    }

    const result = await renderCard({
      service,
      fields,
      templatePath,
      backTemplatePath,
      sourceFilePath,
      password
    });
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Card generation failed." });
  }
}

module.exports = {
  generateCard
};
