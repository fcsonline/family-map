# Geo Family Tree

A React + React Flow family tree viewer with local or API-backed persistence.

## Features

- Local IndexedDB mode with CSV import/export.
- Self-hosted API mode backed by SQLite and uploads.
- Editor for adding, editing, and deleting people.
- Search with keyboard navigation and live match highlighting.
- Settings for locale, theme, and warning visibility (saved to localStorage).
- Printable layout with fit-to-view controls.
- Optional info modal for rich biographies.

## Local development

```bash
npm install
npm run dev
```

To run the API server locally:

```bash
npm run server
```

## Data modes

- `VITE_DATA_MODE=local` (default) stores data in IndexedDB.
- `VITE_DATA_MODE=api` uses the REST API.
- `VITE_API_BASE_URL` sets the API base URL (leave empty for same-origin).

## CSV import/export

- Local mode imports into IndexedDB and exports from the browser.
- API mode uploads the CSV to the server and downloads from `/api/export`.

## Docker

Build the image:

```bash
docker build -t geo-family .
```

Run the container:

```bash
docker run --rm -p 8080:3001 -v $(pwd)/data:/data geo-family
```

Open `http://localhost:8080` in your browser.

## Docker Compose

Use the included `docker-compose.yml` to run the API + UI with a persisted volume:

```bash
docker compose up --build
```

The `geo-family-data` volume stores `/data/geo-family.db` and `/data/uploads`.

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feat/my-change`).
3. Commit your changes.
4. Open a pull request.

## License

MIT
