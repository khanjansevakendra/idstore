# ID Card Generator System

Full-stack scaffold for generating service-specific card previews from uploaded PDF/image files.

## Structure

- `frontend/`: Next.js pages app for login, services, upload, and preview.
- `backend/`: Express API for upload, extraction, render, and download.
- `templates/`: Service template folders and field mappings.

## Run

1. Install dependencies:

```bash
npm install
```

2. Start the backend:

```bash
npm run dev:backend
```

3. In another terminal, start the frontend:

```bash
npm run dev:frontend
```

Frontend defaults to `http://localhost:3000`.
Backend defaults to `http://localhost:4000`.

## Notes

- `fields.json` defines the coordinates used by the render engine.
- Template image slots are expected at `templates/<service>/front.png` and `templates/<service>/back.png`.
- If template PNGs are missing, the backend still generates simple placeholder card images.
- Extraction logic is scaffolded so you can later plug in OCR, PDF parsing, or Python services.

## Custom Identity Sample Template

For the permanent custom template used by `Custom Identity Sample` or `Aadhaar Sample`, place files here:

- `templates/other_cards/front.png`
- `templates/other_cards/back.png`
- `templates/other_cards/fields.json`

`fields.json` controls where extracted values and the photo are drawn on your PNG template.

You can also temporarily override the permanent files from the upload form by selecting:

- `Front PNG template`
- `Back PNG template`
