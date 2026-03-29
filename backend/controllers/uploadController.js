function createUpload(req, res) {
  const document = req.files?.document?.[0];
  const templateFront = req.files?.templateFront?.[0] || null;
  const templateBack = req.files?.templateBack?.[0] || null;

  if (!document) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  return res.status(201).json({
    upload: {
      id: document.filename,
      originalName: document.originalname,
      mimeType: document.mimetype,
      filePath: document.path,
      service: req.body.service || null,
      passwordProvided: Boolean(req.body.password),
      templates: {
        front: templateFront
          ? {
              id: templateFront.filename,
              originalName: templateFront.originalname,
              mimeType: templateFront.mimetype,
              filePath: templateFront.path
            }
          : null,
        back: templateBack
          ? {
              id: templateBack.filename,
              originalName: templateBack.originalname,
              mimeType: templateBack.mimetype,
              filePath: templateBack.path
            }
          : null
      }
    }
  });
}

module.exports = {
  createUpload
};
