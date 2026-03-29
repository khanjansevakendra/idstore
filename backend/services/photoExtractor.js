const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const sharp = require("sharp");

const execFileAsync = promisify(execFile);

async function extractPhoto(filePath, password) {
  const extension = path.extname(filePath).toLowerCase();

  if ([".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
    return filePath;
  }

  if (extension !== ".pdf") {
    return "";
  }

  const tempPrefix = path.join(
    path.dirname(filePath),
    `${path.basename(filePath, extension)}-photo`
  );

  const candidates = await listPdfImages(filePath, password);
  const preferred = pickBestCandidate(candidates);

  if (!preferred) {
    return "";
  }

  await extractPdfImages(filePath, password, preferred.page, tempPrefix);

  const extractedFiles = fs
    .readdirSync(path.dirname(filePath))
    .filter((name) => name.startsWith(path.basename(tempPrefix)) && name.endsWith(".png"))
    .map((name) => path.join(path.dirname(filePath), name));

  if (extractedFiles.length === 0) {
    return "";
  }

  const bestImage = await pickBestExtractedImage(extractedFiles);

  if (!bestImage) {
    return "";
  }

  return bestImage;
}

async function listPdfImages(filePath, password) {
  const attempts = buildPasswordArgs(password);
  let lastError = null;

  for (const passwordArgs of attempts) {
    try {
      const result = await execFileAsync("pdfimages", [...passwordArgs, "-list", filePath]);
      return parsePdfImagesList(result.stdout);
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  if (hasIncorrectPasswordMessage(lastError)) {
    throw new Error("PDF password is incorrect.");
  }

  throw lastError || new Error("Unable to inspect PDF images.");
}

async function extractPdfImages(filePath, password, page, tempPrefix) {
  const attempts = buildPasswordArgs(password);
  let lastError = null;

  for (const passwordArgs of attempts) {
    try {
      await execFileAsync("pdfimages", [
        ...passwordArgs,
        "-f",
        String(page),
        "-l",
        String(page),
        "-png",
        filePath,
        tempPrefix
      ]);
      return;
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  if (hasIncorrectPasswordMessage(lastError)) {
    throw new Error("PDF password is incorrect.");
  }

  throw lastError || new Error("Unable to extract PDF images.");
}

function parsePdfImagesList(output) {
  return output
    .split(/\r?\n/)
    .slice(2)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const columns = line.split(/\s+/);

      return {
        page: Number(columns[0]),
        num: Number(columns[1]),
        type: columns[2],
        width: Number(columns[3]),
        height: Number(columns[4])
      };
    })
    .filter((entry) => entry.type === "image" && entry.width > 40 && entry.height > 40);
}

function pickBestCandidate(candidates) {
  const scored = candidates
    .map((candidate) => {
      const aspectRatio = candidate.width / candidate.height;
      const area = candidate.width * candidate.height;
      const portraitBonus = aspectRatio > 0.55 && aspectRatio < 1.05 ? 1.25 : 0.8;
      const bannerPenalty = aspectRatio > 2.2 ? 0.25 : 1;

      return {
        ...candidate,
        score: area * portraitBonus * bannerPenalty
      };
    })
    .sort((left, right) => right.score - left.score);

  return scored[0] || null;
}

async function pickBestExtractedImage(files) {
  const scored = [];

  for (const file of files) {
    try {
      const metadata = await sharp(file).metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      if (!width || !height) {
        continue;
      }

      const aspectRatio = width / height;
      const area = width * height;
      const portraitBonus = aspectRatio > 0.55 && aspectRatio < 1.05 ? 1.25 : 0.8;
      const bannerPenalty = aspectRatio > 2.2 ? 0.2 : 1;

      scored.push({
        file,
        score: area * portraitBonus * bannerPenalty
      });
    } catch (_error) {
      continue;
    }
  }

  scored.sort((left, right) => right.score - left.score);
  return scored[0]?.file || "";
}

function buildPasswordArgs(password) {
  if (!password) {
    return [[]];
  }

  return [
    ["-upw", password],
    ["-opw", password]
  ];
}

function hasIncorrectPasswordMessage(error) {
  const message = `${error?.stderr || ""} ${error?.message || ""}`.toLowerCase();
  return /incorrect password|invalid password|command line password/i.test(message);
}

module.exports = {
  extractPhoto
};
