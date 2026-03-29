const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

async function unlockPdfIfNeeded(filePath, password) {
  if (!filePath.toLowerCase().endsWith(".pdf")) {
    return filePath;
  }

  const encrypted = await isEncryptedPdf(filePath);

  if (!encrypted) {
    return filePath;
  }

  if (!hasPassword(password)) {
    throw new Error("This PDF is password-protected. Please enter the PDF password.");
  }

  return filePath;
}

async function isEncryptedPdf(filePath) {
  try {
    const { stdout } = await execFileAsync("pdfinfo", [filePath]);
    return /Encrypted:\s+yes/i.test(stdout);
  } catch (_error) {
    return filePath.toLowerCase().endsWith(".pdf");
  }
}

function hasPassword(password) {
  return typeof password === "string" ? password.length > 0 : Boolean(password);
}

module.exports = {
  unlockPdfIfNeeded
};
