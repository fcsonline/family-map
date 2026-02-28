# Family Map

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

- `DATA_MODE=local` (default) keeps all people data in your browser using IndexedDB. CSV imports update the local database and exports are generated in the browser. Use this mode for a fully offline, single-user experience.
- `DATA_MODE=api` reads and writes through the REST API backed by SQLite on the server. CSV imports are uploaded to `/api/import` and exports are downloaded from `/api/export`. Use this mode when you want persistence across devices or users.
- `API_BASE_URL` sets the API base URL (leave empty for same-origin).

## CSV import/export

- Local mode imports into IndexedDB and exports from the browser.
- API mode uploads the CSV to the server and downloads from `/api/export`.

## Docker

Build the image:

```bash
docker build -t family-map .
```

Run the container:

```bash
docker run --rm -p 8080:3001 -v $(pwd)/data:/data family-map
```

Open `http://localhost:8080` in your browser.

## Docker Compose

Use the included `docker-compose.yml` to run the API + UI with a persisted volume:

```bash
docker compose up --build
```

The `family-map-data` volume stores `/data/family-map.db` and `/data/uploads`.

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feat/my-change`).
3. Commit your changes.
4. Open a pull request.

## License

MIT
