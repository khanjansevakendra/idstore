const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const PDF_RENDER_DPI = 300;

async function generatePdfPreview(filePath, password) {
  const previewDirectory = path.join(__dirname, "..", "storage/previews");
  const prefix = path.join(
    previewDirectory,
    `${path.basename(filePath, path.extname(filePath))}-preview`
  );

  const args = [];

  if (password) {
    args.push("-upw", password);
  }

  args.push(
    "-r",
    String(PDF_RENDER_DPI),
    "-f",
    "1",
    "-l",
    "2",
    "-png",
    filePath,
    prefix
  );

  try {
    await execFileAsync("pdftoppm", args);
  } catch (error) {
    const message = `${error?.stderr || ""} ${error?.message || ""}`.toLowerCase();

    if (/incorrect password|invalid password|command line password/i.test(message)) {
      throw new Error("PDF password is incorrect.");
    }

    throw error;
  }

  const fileNames = fs
    .readdirSync(previewDirectory)
    .filter((name) => name.startsWith(path.basename(prefix)) && name.endsWith(".png"))
    .sort();

  return {
    pages: fileNames.map((fileName, index) => ({
      page: index,
      fileName,
      url: `/previews/${fileName}`
    }))
  };
}

module.exports = {
  generatePdfPreview
};
