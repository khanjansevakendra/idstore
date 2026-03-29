const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const uploadRoutes = require("./routes/upload");
const extractRoutes = require("./routes/extract");
const cardRoutes = require("./routes/generate-card");
const downloadRoutes = require("./routes/download");
const pdfPreviewRoutes = require("./routes/pdf-preview");
const cropConfigRoutes = require("./routes/crop-config");

const app = express();
const PORT = process.env.PORT || 4000;

[
  "storage/uploads",
  "storage/extracted_data",
  "storage/generated_cards",
  "storage/previews",
  "storage/crop_configs"
].forEach((directory) => {
  fs.mkdirSync(path.join(__dirname, directory), { recursive: true });
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use("/generated", express.static(path.join(__dirname, "storage/generated_cards")));
app.use("/previews", express.static(path.join(__dirname, "storage/previews")));
app.use("/template-assets", express.static(path.join(__dirname, "..", "templates")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "id-card-generator-backend" });
});

app.use("/upload", uploadRoutes);
app.use("/extract", extractRoutes);
app.use("/generate-card", cardRoutes);
app.use("/download", downloadRoutes);
app.use("/pdf-preview", pdfPreviewRoutes);
app.use("/crop-config", cropConfigRoutes);

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`);
});
