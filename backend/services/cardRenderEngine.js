const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { v4: uuid } = require("uuid");
const { loadTemplate } = require("../utils/templateLoader");
const { applyCoordinates } = require("../utils/coordinatesMapper");
const { loadCropConfig } = require("./cropConfigService");

const OUTPUT_WIDTH = 1012;
const OUTPUT_HEIGHT = 638;
const PDF_RENDER_DPI = 300;
const DEFAULT_CROP_ADJUSTMENTS = {
  brightness: 1.08,
  saturation: 1.28,
  contrast: 1.12,
  sharpen: 1.4,
  contentZoom: 1
};
const SERVICE_DEFAULT_CROP_ADJUSTMENTS = {
  "abha-health-id": {
    brightness: 1.06,
    saturation: 1.16
  },
  "e-shram": {
    brightness: 1.04,
    saturation: 1.14
  }
};
const BASE_CROP_ADJUSTMENTS = {
  brightness: 1,
  saturation: 1,
  contrast: 1,
  sharpen: 0,
  contentZoom: 1
};
const SERVICE_ALLOWED_ADJUSTMENTS = {
  "ayushman-card": [],
  "e-shram": ["brightness", "saturation"],
  "abha-health-id": ["brightness", "saturation"]
};
const FIELD_FONT_BOOST = {
  name: 6,
  name_hi: 6,
  name_en: 6,
  address: 5,
  dob: 5,
  gender: 5
};
const PHOTO_BOOST = {
  brightness: 1.08,
  saturation: 1.1
};
const execFileAsync = promisify(execFile);

function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTextLines(value, maxLength = 34) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (candidate.length > maxLength && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = candidate;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function resolveCropAdjustments(service, overrides = {}) {
  const allowedAdjustments =
    SERVICE_ALLOWED_ADJUSTMENTS[service] || Object.keys(DEFAULT_CROP_ADJUSTMENTS);
  const nextAdjustments = { ...BASE_CROP_ADJUSTMENTS };
  const serviceDefaults = SERVICE_DEFAULT_CROP_ADJUSTMENTS[service] || {};

  for (const key of allowedAdjustments) {
    nextAdjustments[key] = serviceDefaults[key] ?? DEFAULT_CROP_ADJUSTMENTS[key];
  }

  for (const key of allowedAdjustments) {
    if (typeof overrides[key] === "number") {
      nextAdjustments[key] = overrides[key];
    }
  }

  return nextAdjustments;
}

function buildDefaultSvgCard(fields, mappings, title) {
  const placed = applyCoordinates(fields, mappings);

  const lines = placed
    .filter((entry) => entry.key !== "photo")
    .map(
      (entry) => {
        if (entry.key === "address") {
          const addressLines = buildTextLines(entry.value, 32)
            .map(
              (line, index) => `<tspan x="${entry.x}" dy="${index === 0 ? 0 : 28}">${escapeXml(line)}</tspan>`
            )
            .join("");

          return `
            <text x="${entry.x}" y="${entry.y}" font-size="22" font-family="Arial" fill="#1a1a1a">
              ${addressLines}
            </text>`;
        }

        return `
          <text x="${entry.x}" y="${entry.y}" font-size="24" font-family="Arial" fill="#1a1a1a">
            ${escapeXml(entry.value)}
          </text>`;
      }
    )
    .join("");

  return `
    <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f5efe3" />
      <rect x="24" y="24" width="${OUTPUT_WIDTH - 48}" height="${OUTPUT_HEIGHT - 48}" rx="28" fill="#ffffff" stroke="#d7cab8" />
      <text x="50" y="70" font-size="30" font-family="Arial" fill="#0d6c5c">${escapeXml(title)}</text>
      <rect x="50" y="120" width="120" height="150" rx="16" fill="#e8dece" />
      <text x="83" y="205" font-size="20" font-family="Arial" fill="#7b6f62">PHOTO</text>
      ${lines}
    </svg>`;
}

function buildTemplateOverlaySvg(fields, mappings) {
  const placed = applyCoordinates(fields, mappings);

  const lines = placed
    .filter((entry) => entry.key !== "photo" && entry.value)
    .map((entry) => {
      const baseFontSize = entry.fontSize || (entry.key === "masked_id" ? 34 : 20);
      const fontSize = baseFontSize + (FIELD_FONT_BOOST[entry.key] || 0);
      const fontWeight = ["name", "name_hi", "name_en", "masked_id"].includes(entry.key)
        ? "700"
        : "500";
      const fill = entry.key === "masked_id" ? "#000000" : "#111111";

      if (entry.rotate) {
        return `
          <text x="${entry.x}" y="${entry.y}" font-size="${fontSize}" font-family="Arial" font-weight="${fontWeight}" fill="${fill}"
            transform="rotate(${entry.rotate} ${entry.x} ${entry.y})">
            ${escapeXml(entry.value)}
          </text>`;
      }

      if (entry.key === "address") {
        const addressLines = buildTextLines(entry.value, 28)
          .map(
            (line, index) =>
              `<tspan x="${entry.x}" dy="${index === 0 ? 0 : 24}">${escapeXml(line)}</tspan>`
          )
          .join("");

        return `
          <text x="${entry.x}" y="${entry.y}" font-size="${fontSize}" font-family="Arial" font-weight="${fontWeight}" fill="${fill}">
            ${addressLines}
          </text>`;
      }

      return `
        <text x="${entry.x}" y="${entry.y}" font-size="${fontSize}" font-family="Arial" font-weight="${fontWeight}" fill="${fill}">
          ${escapeXml(entry.value)}
        </text>`;
    })
    .join("");

  return `
    <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      ${lines}
    </svg>`;
}

function buildEmptyOverlaySvg() {
  return `
    <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
    </svg>`;
}

function buildAadhaarSampleSvg(fields, title, sideLabel) {
  return `
    <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="24" fill="#ffffff" />
      <rect x="0" y="0" width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" rx="24" fill="#fffdfb" />
      <text x="175" y="330" font-size="78" font-family="Arial" font-weight="700" fill="rgba(201,108,58,0.09)" transform="rotate(-18 175 330)">SAMPLE PREVIEW</text>
      <rect x="40" y="40" width="58" height="78" rx="14" fill="none" stroke="#1b1b1b" stroke-width="3" />
      <text x="58" y="88" font-size="24" font-family="Arial" font-weight="700" fill="#1b1b1b">ID</text>
      <rect x="165" y="35" width="430" height="14" rx="7" fill="#ef8a00" />
      <text x="320" y="72" font-size="24" font-family="Arial" font-weight="700" fill="#1b1b1b">Bharat Pahchan Sample</text>
      <rect x="165" y="88" width="520" height="14" rx="7" fill="#0cb56d" />
      <text x="260" y="126" font-size="24" font-family="Arial" font-weight="700" fill="#1b1b1b">India Identity Preview</text>
      <circle cx="887" cy="70" r="38" fill="none" stroke="#e96c2d" stroke-width="7" />
      <circle cx="887" cy="70" r="24" fill="none" stroke="#df2e4f" stroke-width="6" />
      <circle cx="887" cy="70" r="12" fill="none" stroke="#df2e4f" stroke-width="5" />

      <text x="50" y="170" font-size="24" font-family="Arial" fill="#7b6f62">${escapeXml(sideLabel)}</text>
      <rect x="50" y="195" width="120" height="145" rx="16" fill="#f3eee5" stroke="#dbcbb6" />
      <text x="83" y="276" font-size="20" font-family="Arial" fill="#7b6f62">PHOTO</text>

      <text x="220" y="215" font-size="26" font-family="Arial" font-weight="700" fill="#1a1a1a">${escapeXml(fields.name || "")}</text>
      <text x="220" y="255" font-size="22" font-family="Arial" fill="#1a1a1a">DOB: ${escapeXml(fields.dob || "")}</text>
      <text x="220" y="295" font-size="22" font-family="Arial" fill="#1a1a1a">Gender: ${escapeXml(fields.gender || "")}</text>
      <text x="220" y="335" font-size="22" font-family="Arial" fill="#1a1a1a">ID: ${escapeXml(fields.id_number || "")}</text>
      <text x="220" y="375" font-size="20" font-family="Arial" fill="#1a1a1a">${escapeXml(fields.address || "")}</text>

      <rect x="44" y="560" width="924" height="4" rx="2" fill="#ff2b12" />
      <text x="314" y="615" font-size="40" font-family="Arial" font-weight="700" fill="#1f1b18">${escapeXml(title)}</text>
    </svg>`;
}

function buildAadhaarSampleBackSvg() {
  return `
    <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" rx="24" fill="#fffdfb" />
      <text x="170" y="330" font-size="78" font-family="Arial" font-weight="700" fill="rgba(201,108,58,0.09)" transform="rotate(-18 170 330)">SAMPLE PREVIEW</text>
      <rect x="40" y="560" width="932" height="4" rx="2" fill="#ff2b12" />
      <rect x="260" y="390" width="490" height="110" fill="#ffffff" stroke="#c53b29" stroke-width="3" />
      <text x="278" y="430" font-size="22" font-family="Arial" fill="#1a1a1a">Non-official preview for internal testing and review.</text>
      <text x="278" y="465" font-size="22" font-family="Arial" fill="#1a1a1a">Do not use as an identity or government document.</text>
      <text x="302" y="615" font-size="36" font-family="Arial" font-weight="700" fill="#1f1b18">Custom Preview Layout</text>
    </svg>`;
}

function buildStudentIdFrontSvg(fields) {
  return `
    <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" fill="#ffffff" />
      <path d="M20 10 H990 V170 Q860 135 760 170 H20 Z" fill="#0a63b7" />
      <circle cx="105" cy="95" r="58" fill="#ffffff" stroke="#d7e7fb" stroke-width="8" />
      <text x="76" y="108" font-size="34" font-family="Arial" font-weight="700" fill="#0a63b7">GS</text>

      <text x="240" y="78" font-size="52" font-family="Arial" font-weight="800" fill="#ffffff">GLORY HIGHER SECONDARY SCHOOL</text>
      <text x="607" y="122" font-size="36" font-family="Arial" font-weight="700" fill="#ffee47">Your Address Type Here</text>
      <text x="610" y="160" font-size="28" font-family="Arial" font-weight="700" fill="#ffffff">Phone No. 00 - 00000</text>

      <rect x="395" y="210" width="520" height="74" rx="22" fill="#0a63b7" />
      <text x="435" y="260" font-size="44" font-family="Arial" font-weight="800" fill="#ffee47">STUDENT IDENTITY CARD</text>

      <text x="160" y="385" font-size="26" font-family="Arial" font-weight="700" fill="#121212">Student ID</text>
      <text x="410" y="385" font-size="26" font-family="Arial" font-weight="700" fill="#121212">:</text>
      <text x="455" y="385" font-size="26" font-family="Arial" font-weight="700" fill="#1b87d1">${escapeXml(fields.id_number || "123456")}</text>

      <text x="160" y="430" font-size="26" font-family="Arial" font-weight="700" fill="#121212">Student Name</text>
      <text x="410" y="430" font-size="26" font-family="Arial" font-weight="700" fill="#121212">:</text>
      <text x="455" y="430" font-size="26" font-family="Arial" font-weight="700" fill="#1b87d1">${escapeXml(fields.name || "First Name Last Name")}</text>

      <text x="160" y="475" font-size="26" font-family="Arial" font-weight="700" fill="#121212">Father's Name</text>
      <text x="410" y="475" font-size="26" font-family="Arial" font-weight="700" fill="#121212">:</text>
      <text x="455" y="475" font-size="26" font-family="Arial" font-weight="700" fill="#1b87d1">${escapeXml(fields.father_name || "Surname First Name")}</text>

      <text x="160" y="520" font-size="26" font-family="Arial" font-weight="700" fill="#121212">Contact No</text>
      <text x="410" y="520" font-size="26" font-family="Arial" font-weight="700" fill="#121212">:</text>
      <text x="455" y="520" font-size="26" font-family="Arial" font-weight="700" fill="#1b87d1">${escapeXml(fields.contact_no || "0123456789")}</text>

      <text x="160" y="565" font-size="26" font-family="Arial" font-weight="700" fill="#121212">Class</text>
      <text x="410" y="565" font-size="26" font-family="Arial" font-weight="700" fill="#121212">:</text>
      <text x="455" y="565" font-size="26" font-family="Arial" font-weight="700" fill="#1b87d1">${escapeXml(fields.class_name || "VI")}</text>

      <text x="160" y="610" font-size="26" font-family="Arial" font-weight="700" fill="#121212">Roll No</text>
      <text x="410" y="610" font-size="26" font-family="Arial" font-weight="700" fill="#121212">:</text>
      <text x="455" y="610" font-size="26" font-family="Arial" font-weight="700" fill="#1b87d1">${escapeXml(fields.roll_no || "10")}</text>

      <rect x="745" y="365" width="180" height="220" rx="22" fill="#ffffff" stroke="#111111" stroke-width="4" />
      <text x="800" y="485" font-size="26" font-family="Arial" font-weight="700" fill="#6f6f6f">PHOTO</text>
      <line x1="720" y1="605" x2="940" y2="605" stroke="#111111" stroke-width="3" />
      <text x="770" y="635" font-size="24" font-family="Arial" font-weight="700" fill="#111111">Signature Here</text>

      <rect x="20" y="620" width="972" height="18" fill="#0a63b7" />
    </svg>`;
}

function buildStudentIdBackSvg() {
  return `
    <svg width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${OUTPUT_WIDTH}" height="${OUTPUT_HEIGHT}" fill="#ffffff" />
      <path d="M20 10 H990 V170 Q860 135 760 170 H20 Z" fill="#0a63b7" />
      <circle cx="105" cy="95" r="58" fill="#ffffff" stroke="#d7e7fb" stroke-width="8" />
      <text x="76" y="108" font-size="34" font-family="Arial" font-weight="700" fill="#0a63b7">GS</text>
      <text x="270" y="88" font-size="44" font-family="Arial" font-weight="800" fill="#ffffff">STUDENT CARD NOTES</text>
      <text x="270" y="132" font-size="28" font-family="Arial" font-weight="700" fill="#ffee47">Emergency, transport and guardian information</text>

      <rect x="86" y="230" width="840" height="300" rx="26" fill="#f7fbff" stroke="#c9d9ea" stroke-width="3" />
      <line x1="140" y1="300" x2="860" y2="300" stroke="#aac6e7" stroke-width="4" />
      <line x1="140" y1="360" x2="860" y2="360" stroke="#aac6e7" stroke-width="4" />
      <line x1="140" y1="420" x2="860" y2="420" stroke="#aac6e7" stroke-width="4" />
      <line x1="140" y1="480" x2="720" y2="480" stroke="#aac6e7" stroke-width="4" />
      <text x="145" y="580" font-size="26" font-family="Arial" font-weight="700" fill="#111111">Add transport route, blood group, address, or school rules here.</text>

      <rect x="20" y="620" width="972" height="18" fill="#0a63b7" />
    </svg>`;
}

function buildSvgCard(service, fields, mappings, title, sideLabel) {
  if ((service || "").startsWith("aadhaar-sample")) {
    if (sideLabel === "Back") {
      return buildEmptyOverlaySvg();
    }

    return buildTemplateOverlaySvg(fields, mappings);
  }

  if ((service || "").startsWith("custom-identity")) {
    if (sideLabel === "Back") {
      return buildEmptyOverlaySvg();
    }

    return buildTemplateOverlaySvg(fields, mappings);
  }

  if ((service || "").startsWith("aadhaar")) {
    if (sideLabel === "Back") {
      return buildAadhaarSampleBackSvg();
    }

    return buildAadhaarSampleSvg(fields, title, sideLabel);
  }

  if ((service || "").startsWith("student-id")) {
    if (sideLabel === "Back") {
      return buildStudentIdBackSvg();
    }

    return buildStudentIdFrontSvg(fields);
  }

  return buildDefaultSvgCard(fields, mappings, title);
}

async function createCardImage(templatePath, svgMarkup, outputPath) {
  let image = sharp({
    create: {
      width: OUTPUT_WIDTH,
      height: OUTPUT_HEIGHT,
      channels: 4,
      background: "#f5efe3"
    }
  });

  if (templatePath && fs.existsSync(templatePath)) {
    image = sharp(templatePath).resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
      fit: "cover"
    });
  }

  await image
    .composite([{ input: Buffer.from(svgMarkup), top: 0, left: 0 }])
    .png()
    .toFile(outputPath);
}

async function compositePhoto(outputPath, photoPath, options) {
  if (!photoPath || !fs.existsSync(photoPath)) {
    return;
  }

  const width = options?.width || 120;
  const height = options?.height || 145;
  const left = options?.left || 50;
  const top = options?.top || 195;

  const photoBuffer = await sharp(photoPath)
    .resize(width, height, { fit: "cover", position: "center" })
    .modulate(PHOTO_BOOST)
    .sharpen()
    .png()
    .toBuffer();

  await sharp(outputPath)
    .composite([{ input: photoBuffer, top, left }])
    .png()
    .toFile(`${outputPath}.tmp`);

  fs.renameSync(`${outputPath}.tmp`, outputPath);
}

async function createPdfPageImage(filePath, password, pageNumber, outputRoot) {
  const args = [];

  if (password) {
    args.push("-upw", password);
  }

  args.push(
    "-r",
    String(PDF_RENDER_DPI),
    "-f",
    String(pageNumber),
    "-l",
    String(pageNumber),
    "-png",
    filePath,
    outputRoot
  );

  await execFileAsync("pdftoppm", args);
  return `${outputRoot}-${pageNumber}.png`;
}

async function cropImage(inputPath, crop, outputPath, service) {
  const adjustments = resolveCropAdjustments(service, crop?.adjustments || {});
  const metadata = await sharp(inputPath).metadata();
  const width = metadata.width || OUTPUT_WIDTH;
  const height = metadata.height || OUTPUT_HEIGHT;

  const left = Math.max(0, Math.round(crop.x * width));
  const top = Math.max(0, Math.round(crop.y * height));
  const extractWidth = Math.min(width - left, Math.round(crop.width * width));
  const extractHeight = Math.min(height - top, Math.round(crop.height * height));
  const safeExtractWidth = Math.max(1, extractWidth);
  const safeExtractHeight = Math.max(1, extractHeight);
  const contentZoom = Math.max(1, Number(adjustments.contentZoom || 1));

  let image = sharp(inputPath)
    .extract({
      left,
      top,
      width: safeExtractWidth,
      height: safeExtractHeight
    });

  if (
    service !== "ayushman-card" &&
    service !== "e-shram" &&
    service !== "abha-health-id"
  ) {
    image = image.normalise();
  }

  if (contentZoom > 1) {
    const zoomedWidth = Math.max(safeExtractWidth, Math.round(safeExtractWidth * contentZoom));
    const zoomedHeight = Math.max(safeExtractHeight, Math.round(safeExtractHeight * contentZoom));
    const extractLeft = Math.max(0, Math.round((zoomedWidth - safeExtractWidth) / 2));
    const extractTop = Math.max(0, Math.round((zoomedHeight - safeExtractHeight) / 2));

    image = image
      .resize(zoomedWidth, zoomedHeight, { fit: "fill" })
      .extract({
        left: extractLeft,
        top: extractTop,
        width: safeExtractWidth,
        height: safeExtractHeight
      });
  }

  image = image
    .linear(adjustments.contrast, -(128 * adjustments.contrast) + 128)
    .modulate({
      brightness: adjustments.brightness,
      saturation: adjustments.saturation
    });

  if (adjustments.sharpen > 0) {
    image = image.sharpen(adjustments.sharpen);
  }

  await image
    .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, {
      fit: "fill"
    })
    .png()
    .toFile(outputPath);
}

async function renderFromCropPreset({
  service,
  sourceFilePath,
  password,
  outputDirectory,
  frontFileName,
  backFileName
}) {
  const cropConfig = loadCropConfig(service);

  if (!cropConfig || !sourceFilePath || !sourceFilePath.toLowerCase().endsWith(".pdf")) {
    return null;
  }

  const previewRoot = path.join(
    outputDirectory,
    `${path.basename(sourceFilePath, path.extname(sourceFilePath))}-${Date.now()}`
  );
  const frontSource = await createPdfPageImage(
    sourceFilePath,
    password,
    (cropConfig.front.page || 0) + 1,
    `${previewRoot}-front`
  );
  const backSource = await createPdfPageImage(
    sourceFilePath,
    password,
    (cropConfig.back.page || 0) + 1,
    `${previewRoot}-back`
  );
  const frontPath = path.join(outputDirectory, frontFileName);
  const backPath = path.join(outputDirectory, backFileName);

  await cropImage(frontSource, {
    ...cropConfig.front,
    adjustments: cropConfig.adjustments
  }, frontPath, service);
  await cropImage(backSource, {
    ...cropConfig.back,
    adjustments: cropConfig.adjustments
  }, backPath, service);

  return {
    service,
    files: {
      front: {
        fileName: frontFileName,
        path: frontPath,
        url: `/download/${frontFileName}`
      },
      back: {
        fileName: backFileName,
        path: backPath,
        url: `/download/${backFileName}`
      }
    }
  };
}

async function renderCard({
  service,
  fields,
  templatePath,
  backTemplatePath,
  sourceFilePath,
  password
}) {
  const template = loadTemplate(service);
  const cardId = uuid();
  const outputDirectory = path.join(__dirname, "..", "storage/generated_cards");
  const frontFileName = `${service}-${cardId}-front.png`;
  const backFileName = `${service}-${cardId}-back.png`;
  const frontPath = path.join(outputDirectory, frontFileName);
  const backPath = path.join(outputDirectory, backFileName);

  const cropRendered = await renderFromCropPreset({
    service,
    sourceFilePath,
    password,
    outputDirectory,
    frontFileName,
    backFileName
  });

  if (cropRendered) {
    return {
      service,
      cardId,
      files: cropRendered.files
    };
  }

  const frontSvg = buildSvgCard(service, fields, template.fields, "Mera Sample Card", "Front");
  const backSvg = buildSvgCard(service, fields, template.fields, "Custom Preview Layout", "Back");

  const frontTemplatePath = templatePath || template.front;
  const resolvedBackTemplatePath = backTemplatePath || template.back;
  await createCardImage(frontTemplatePath, frontSvg, frontPath);
  await createCardImage(resolvedBackTemplatePath, backSvg, backPath);

  if (fields.photo) {
    if ((service || "").startsWith("aadhaar") && !(service || "").startsWith("aadhaar-sample")) {
      await compositePhoto(frontPath, fields.photo, {
        left: 50,
        top: 195,
        width: 120,
        height: 145
      });
    } else {
      if (
        (service || "").startsWith("student-id") ||
        (service || "").startsWith("custom-identity") ||
        (service || "").startsWith("aadhaar-sample")
      ) {
        await compositePhoto(frontPath, fields.photo, {
          left: template.fields.photo?.x || 745,
          top: template.fields.photo?.y || 365,
          width: template.fields.photo?.width || 180,
          height: template.fields.photo?.height || 220
        });
        return {
          service,
          cardId,
          files: {
            front: {
              fileName: frontFileName,
              path: frontPath,
              url: `/download/${frontFileName}`
            },
            back: {
              fileName: backFileName,
              path: backPath,
              url: `/download/${backFileName}`
            }
          }
        };
      }

      await compositePhoto(frontPath, fields.photo, {
        left: template.fields.photo?.x || 50,
        top: template.fields.photo?.y || 120,
        width: 120,
        height: 150
      });
    }
  }

  return {
    service,
    cardId,
    files: {
      front: {
        fileName: frontFileName,
        path: frontPath,
        url: `/download/${frontFileName}`
      },
      back: {
        fileName: backFileName,
        path: backPath,
        url: `/download/${backFileName}`
      }
    }
  };
}

module.exports = {
  renderCard
};
