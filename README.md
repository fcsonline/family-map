# Family Map

A React + React Flow family tree viewer driven by a CSV source of truth.

## Features

- CSV-driven genealogy map with custom nodes and edges.
- Search with keyboard navigation and live match highlighting.
- Settings for locale, theme, and warning visibility (saved to localStorage).
- Printable layout with fit-to-view controls.
- Optional info modal for rich biographies.

## Local development

```bash
npm install
npm run dev
```

## Docker

Build the image:

```bash
docker build -t family-map .
```

Run the container:

```bash
docker run --rm -p 8080:80 family-map
```

Open `http://localhost:8080` in your browser.

## Docker Compose

Create a `docker-compose.yml` with:

```yaml
version: "3.9"
services:
  family-map:
    build: .
    ports:
      - "8080:80"
```

Then run:

```bash
docker compose up --build
```

## Contributing

1. Fork the repo.
2. Create a feature branch (`git checkout -b feat/my-change`).
3. Commit your changes.
4. Open a pull request.

## License

MIT
