const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

function inferServicePrefix(service = "") {
  return service
    .replace(/-/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .trim();
}

async function parseDocument(filePath, service, password) {
  const baseName = path.basename(filePath, path.extname(filePath));
  const label = inferServicePrefix(service) || "Document";
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".pdf") {
    const text = await extractPdfText(filePath, password);
    const parsed = parseKnownFields(text, service);

    return {
      name: parsed.name || `${label} Holder`,
      name_hi: parsed.name_hi || "",
      name_en: parsed.name_en || parsed.name || `${label} Holder`,
      dob: parsed.dob || "Not found",
      gender: parsed.gender || "Not found",
      id_number: parsed.id_number || `${baseName.slice(0, 4).toUpperCase()}-${baseName.slice(-4).toUpperCase()}`,
      masked_id: parsed.masked_id || parsed.id_number || "",
      vid: parsed.vid || "",
      issued_date: parsed.issued_date || "",
      address: parsed.address || "Address not found in document",
      source_text: text
    };
  }

  return {
    name: `${label} Holder`,
    name_hi: "",
    name_en: `${label} Holder`,
    dob: "01/01/1990",
    gender: "Male",
    id_number: `${baseName.slice(0, 4).toUpperCase()}-${baseName.slice(-4).toUpperCase()}`,
    masked_id: `${baseName.slice(0, 4).toUpperCase()}-${baseName.slice(-4).toUpperCase()}`,
    vid: "",
    issued_date: "",
    address: "Sample address captured from parser pipeline"
  };
}

async function extractPdfText(filePath, password) {
  const passwordAttempts = buildPasswordArgs(password);
  let lastError = null;

  for (const passwordArgs of passwordAttempts) {
    try {
      const { stdout } = await execFileAsync("pdftotext", [...passwordArgs, filePath, "-"]);

      return stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .join("\n");
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  if (hasIncorrectPasswordMessage(lastError)) {
    throw new Error("PDF password is incorrect.");
  }

  throw lastError || new Error("Unable to read PDF text.");
}

function parseKnownFields(text, service) {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const upperText = text.toUpperCase();
  const normalizedService = (service || "").toLowerCase();
  let result = {};

  if (
    normalizedService.includes("aadhaar") &&
    !normalizedService.includes("aadhaar-sample") &&
    looksLikeAadhaarDocument(text)
  ) {
    result = parseAadhaarFields(lines, text);
  } else if (
    normalizedService.includes("student-id") ||
    normalizedService.includes("custom-identity") ||
    normalizedService.includes("aadhaar-sample")
  ) {
    result =
      normalizedService.includes("aadhaar-sample") ||
      looksLikeAadhaarSampleContent(text)
      ? parseAadhaarSampleFields(lines, text)
      : parseStudentCardFields(lines, text);
  }

  result.name = result.name || findLabeledValue(lines, [
    "NAME",
    "NAME OF ENTERPRISE",
    "NAME OF UNIT",
    "NAME OF UNIT(S)",
    "APPLICANT NAME",
    "CARD HOLDER NAME",
    "OWNER NAME"
  ]);

  result.dob = result.dob || findRegexValue(text, [
    /\bDOB\b\s*[:\-]?\s*([0-3]?\d\/[01]?\d\/(?:19|20)\d{2})/i,
    /\bDATE OF BIRTH\b\s*[:\-]?\s*([0-3]?\d\/[01]?\d\/(?:19|20)\d{2})/i,
    /\bYEAR OF BIRTH\b\s*[:\-]?\s*((?:19|20)\d{2})/i
  ]);

  result.gender = normalizeGender(result.gender || findRegexValue(text, [
    /\bGENDER\b\s*[:\-]?\s*(MALE|FEMALE|TRANSGENDER)/i,
    /\bSEX\b\s*[:\-]?\s*(MALE|FEMALE|TRANSGENDER)/i,
    /\b(MALE|FEMALE|TRANSGENDER)\b/i
  ]));

  result.id_number = result.id_number || findIdNumber(lines, upperText, service);
  result.address = result.address || findAddress(lines, service);

  return result;
}

function parseStudentCardFields(lines, text) {
  return {
    id_number: findLabeledValue(lines, [
      "STUDENT ID",
      "ID NO",
      "ID NUMBER",
      "ADMISSION NO",
      "REGISTRATION NO"
    ]) || findRegexValue(text, [/\b(?:ID|ADMISSION|REGISTRATION)[\s.:#-]*([A-Z0-9/-]{4,})/i]),
    name: findLabeledValue(lines, [
      "STUDENT NAME",
      "NAME OF STUDENT",
      "NAME"
    ]),
    father_name: findLabeledValue(lines, [
      "FATHER'S NAME",
      "FATHER NAME",
      "FATHER/GUARDIAN NAME",
      "GUARDIAN NAME"
    ]),
    contact_no: findLabeledValue(lines, [
      "CONTACT NO",
      "CONTACT NUMBER",
      "MOBILE",
      "MOBILE NO",
      "PHONE",
      "PHONE NO"
    ]) || findRegexValue(text, [/\b([6-9]\d{9})\b/]),
    class_name: findLabeledValue(lines, [
      "CLASS",
      "STD",
      "STANDARD"
    ]),
    roll_no: findLabeledValue(lines, [
      "ROLL NO",
      "ROLL NUMBER"
    ]),
    issue_date: findLabeledValue(lines, [
      "ISSUE DATE",
      "DATE OF ISSUE"
    ]) || findRegexValue(text, [/\bISSUE DATE\b\s*[:\-]?\s*([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i]),
    valid_date: findLabeledValue(lines, [
      "VALID DATE",
      "VALID UPTO",
      "VALID TILL",
      "EXPIRY DATE",
      "EXPIRE DATE"
    ]) || findRegexValue(text, [/\b(?:VALID DATE|VALID UPTO|VALID TILL|EXPIRY DATE)\b\s*[:\-]?\s*([0-3]?\d[\/.-][01]?\d[\/.-](?:19|20)\d{2})/i])
  };
}

function parseAadhaarSampleFields(lines, text) {
  const result = {};
  const filteredLines = lines.filter(
    (line) =>
      !/government of india|भारत सरकार|aadhaar|आधार|uidai|enrolment|download date|sample/i.test(line)
  );

  result.name_hi = findHindiName(filteredLines);
  result.name_en = findEnglishName(filteredLines);
  result.name = result.name_en || result.name_hi || "";
  result.dob = findRegexValue(text, [
    /\bDOB\b\s*[:\-]?\s*([0-3]?\d\/[01]?\d\/(?:19|20)\d{2})/i,
    /जन्म तिथि\/DOB[:\s]*([0-3]?\d\/[01]?\d\/(?:19|20)\d{2})/i
  ]);
  result.gender = findSampleGender(text);
  result.masked_id = findRegexValue(text, [/\b(?:X{4}|\d{4})\s(?:X{4}|\d{4})\s\d{4}\b/i]);
  result.id_number = result.masked_id;
  result.vid = findRegexValue(text, [/\bVID\b\s*[:\-]?\s*(\d{4}\s\d{4}\s\d{4}\s\d{4})/i]);
  result.issued_date = findIssuedDate(text);

  return result;
}

function parseAadhaarFields(lines, text) {
  const result = {};
  const relevantLines = lines.filter(
    (line) =>
      !/government of india|भारत सरकार|aadhaar|आधार|enrolment|download date|issue date|sample preview/i.test(line)
  );

  result.id_number = findRegexValue(text, [/\b\d{4}\s\d{4}\s\d{4}\b/]);
  result.dob = findRegexValue(text, [
    /\bDOB\b\s*[:\-]?\s*([0-3]?\d\/[01]?\d\/(?:19|20)\d{2})/i,
    /\bYear of Birth\b\s*[:\-]?\s*((?:19|20)\d{2})/i
  ]);
  result.gender = normalizeGender(findRegexValue(text, [/\b(MALE|FEMALE|TRANSGENDER)\b/i]));

  const pivotIndex = relevantLines.findIndex((line) =>
    /DOB|YEAR OF BIRTH|MALE|FEMALE|TRANSGENDER/i.test(line)
  );

  if (pivotIndex > 0) {
    const candidate = sanitizeValue(relevantLines[pivotIndex - 1]);
    if (isLikelyPersonName(candidate)) {
      result.name = candidate;
    }
  }

  result.address = findAddress(lines, "aadhaar");
  return result;
}

function findHindiName(lines) {
  return (
    lines.find(
      (line) =>
        /[\u0900-\u097F]/.test(line) &&
        !/जन्म|पुरुष|महिला|वर्ष|सरकार|आधार|भारत/i.test(line)
    ) || ""
  );
}

function findEnglishName(lines) {
  return (
    lines.find(
      (line) =>
        /^[A-Za-z][A-Za-z\s.]{2,}$/.test(line) &&
        !/government|india|dob|male|female|address|vid/i.test(line)
    ) || ""
  );
}

function findSampleGender(text) {
  const raw = findRegexValue(text, [
    /पुरुष\/\s*(MALE)/i,
    /महिला\/\s*(FEMALE)/i,
    /\b(MALE|FEMALE|TRANSGENDER)\b/i
  ]);

  return normalizeGender(raw);
}

function findIssuedDate(text) {
  return (
    findRegexValue(text, [
      /\bIssued[:\s-]*([0-3]?\d\/[01]?\d\/(?:19|20)\d{2})/i,
      /\bIssued Date[:\s-]*([0-3]?\d\/[01]?\d\/(?:19|20)\d{2})/i,
      /\bAadhaar No\. Issued[:\s-]*([0-3]?\d\/[01]?\d\/(?:19|20)\d{2})/i
    ]) || ""
  );
}

function looksLikeAadhaarDocument(text) {
  return /(government of india|भारत सरकार|aadhaar|आधार|uidai|year of birth|dob)/i.test(text);
}

function looksLikeAadhaarSampleContent(text) {
  return /(enrolment no|नामांकन क्रम|aadhaar no\. issued|vid\s*:|xxxx xxxx \d{4}|जन्म तिथि\/dob|पुरुष\/\s*male)/i.test(text);
}

function findLabeledValue(lines, labels) {
  const uppercaseLabels = labels.map((label) => label.toUpperCase());

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const upperLine = line.toUpperCase();

    for (const label of uppercaseLabels) {
      if (upperLine === label && lines[index + 1]) {
        return sanitizeValue(lines[index + 1]);
      }

      if (upperLine.startsWith(`${label}:`) || upperLine.startsWith(`${label} :`)) {
        return sanitizeValue(line.split(/:\s*/).slice(1).join(": "));
      }
    }
  }

  return "";
}

function findRegexValue(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match && match[1]) {
      return sanitizeValue(match[1]);
    }
  }

  return "";
}

function normalizeGender(value) {
  const normalized = sanitizeValue(value).toUpperCase();

  if (normalized === "MALE") {
    return "Male";
  }
  if (normalized === "FEMALE") {
    return "Female";
  }
  if (normalized === "TRANSGENDER") {
    return "Transgender";
  }

  return sanitizeValue(value);
}

function findIdNumber(lines, upperText, service) {
  const serviceUpper = (service || "").toUpperCase();
  const knownPatterns = [
    /\b\d{4}\s\d{4}\s\d{4}\b/,
    /\b[A-Z]{5}\d{4}[A-Z]\b/,
    /\b[A-Z]{2,8}-[A-Z0-9-]{4,}\b/,
    /\bUDYAM-[A-Z]{2}-\d{2}-\d{7}\b/,
    /\b[A-Z0-9]{8,20}\b/
  ];

  if (serviceUpper.includes("AADHAAR")) {
    const aadhaarMatch = upperText.match(/\b\d{4}\s\d{4}\s\d{4}\b/);
    if (aadhaarMatch) {
      return sanitizeValue(aadhaarMatch[0]);
    }
  }

  if (upperText.includes("UDYAM REGISTRATION NUMBER")) {
    const udyamMatch = upperText.match(/\bUDYAM-[A-Z]{2}-\d{2}-\d{7}\b/);
    if (udyamMatch) {
      return sanitizeValue(udyamMatch[0]);
    }
  }

  for (const line of lines) {
    for (const pattern of knownPatterns) {
      const match = line.match(pattern);
      if (match) {
        return sanitizeValue(match[0]);
      }
    }
  }

  return "";
}

function findAddress(lines, service) {
  if ((service || "").toLowerCase().includes("aadhaar")) {
    const addressStart = lines.findIndex((line) => /^address[:\s]*$/i.test(line) || /^address/i.test(line));

    if (addressStart !== -1) {
      return collectAddressBlock(lines.slice(addressStart + 1), 6);
    }
  }

  const startIndex = lines.findIndex((line) =>
    /ADDRESS OF|OFFICAL ADDRESS OF ENTERPRISE|OFFICIAL ADDRESS OF ENTERPRISE|ADDRESS/i.test(line)
  );

  if (startIndex === -1) {
    return "";
  }

  return collectAddressBlock(lines.slice(startIndex + 1), 6);
}

function collectAddressBlock(lines, limit) {
  const skippedLabels = new Set([
    "S.NO.",
    "SNO.",
    "NAME OF UNIT",
    "NAME OF UNIT(S)",
    "FLAT/DOOR/BLOCK NO.",
    "NAME OF PREMISES/ BUILDING",
    "VILLAGE/TOWN",
    "BLOCK",
    "ROAD/STREET/LANE",
    "STATE",
    "DISTRICT",
    "CITY",
    "ADDRESS"
  ]);
  const collected = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = sanitizeValue(lines[index]);
    const upperLine = line.toUpperCase();

    if (!line) {
      continue;
    }

    if (
      /EMAIL|MOBILE|DATE OF|REGISTRATION|CLASSIFICATION|ACTIVITY|CATEGORY|VID|VIRTUAL ID|HELP|DOWNLOAD|PRINT|PAGE \d+/i.test(line) &&
      collected.length > 0
    ) {
      break;
    }

    if (skippedLabels.has(upperLine)) {
      continue;
    }

    if (/^\d{4}\s\d{4}\s\d{4}$/.test(line)) {
      break;
    }

    collected.push(line);

    if (collected.length >= limit) {
      break;
    }
  }

  return sanitizeAddress(collected);
}

function sanitizeAddress(parts) {
  return sanitizeValue(
    parts
      .join(", ")
      .replace(/\bName of Unit\(s\)\b/gi, "")
      .replace(/\bFlat\/Door\/Block No\.?\s*/gi, "")
      .replace(/\bName of Premises\/ Building\s*/gi, "")
      .replace(/\bRoad\/Street\/Lane\s*/gi, "")
      .replace(/\bVillage\/Town\s*/gi, "")
      .replace(/\bDistrict\s*/gi, "")
      .replace(/\bState\s*/gi, "")
      .replace(/\bCity\s*/gi, "")
      .replace(/\bBlock\s*/gi, "")
      .replace(/\s*\.\s*/g, " ")
      .replace(/\s{2,}/g, " ")
      .replace(/,\s*,/g, ",")
  );
}

function isLikelyPersonName(value) {
  const cleaned = sanitizeValue(value);

  if (!cleaned || cleaned.length < 3) {
    return false;
  }

  if (/\d/.test(cleaned)) {
    return false;
  }

  return !/government|india|address|male|female|dob|year of birth/i.test(cleaned);
}

function sanitizeValue(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\s+,/g, ",")
    .trim();
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
  parseDocument
};
