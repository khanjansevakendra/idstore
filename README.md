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

## GitHub Pages Deployment

The frontend is configured for static export and can be deployed from GitHub Actions to:

- `https://remove.khanjansevakendra.shop`

Required GitHub repository setup:

1. Open `Settings > Pages`.
2. Under `Build and deployment`, set `Source` to `GitHub Actions`.
3. Add a repository variable named `NEXT_PUBLIC_API_BASE_URL` that points to your live backend API, for example `https://your-backend.example.com`.

The workflow file is:

- `.github/workflows/deploy-pages.yml`

Important:

- GitHub Pages only hosts the `frontend` app.
- The `backend` Express server cannot run on GitHub Pages, so uploads and card generation will only work after the backend is deployed separately.
- The custom domain is kept via the existing `CNAME` file: `remove.khanjansevakendra.shop`.

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
