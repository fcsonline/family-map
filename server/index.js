import cors from "cors";
import express from "express";
import multer from "multer";
import Papa from "papaparse";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const uploadsDir = path.join(dataDir, "uploads");
const dbPath = path.join(dataDir, "family-map.db");
const distDir = path.join(__dirname, "..", "dist");
let db;

const personFields = [
  "id",
  "name",
  "birth_day",
  "death_day",
  "birth_place",
  "father",
  "mother",
  "avatar_url",
  "info",
];

const ensureDir = async () => {
  await fs.mkdir(uploadsDir, { recursive: true });
};

const run = (sql, params = []) =>
  Promise.resolve(db.prepare(sql).run(...params));
const all = (sql, params = []) =>
  Promise.resolve(db.prepare(sql).all(...params));

const normalizeId = (value) => (value ? value.trim() : "");
const normalizePerson = (row) => ({
  id: normalizeId(row.id),
  name: row.name?.trim() || "Unknown",
  birth_day: row.birth_day?.trim() || "",
  death_day: row.death_day?.trim() || "",
  birth_place: row.birth_place?.trim() || "",
  father: normalizeId(row.father),
  mother: normalizeId(row.mother),
  avatar_url: row.avatar_url?.trim() || "",
  info: row.info?.trim() || "",
});

const initDb = async () => {
  await run(
    `CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT,
      birth_day TEXT,
      death_day TEXT,
      birth_place TEXT,
      father TEXT,
      mother TEXT,
      avatar_url TEXT,
      info TEXT
    )`,
  );
};

const insertPerson = async (person) => {
  const values = personFields.map((field) => person[field] ?? "");
  await run(
    `INSERT OR REPLACE INTO people (${personFields.join(
      ", ",
    )}) VALUES (${personFields.map(() => "?").join(", ")})`,
    values,
  );
};

const memoryUpload = multer({ storage: multer.memoryStorage() });
const avatarUpload = multer({ storage: multer.memoryStorage() });

const formalizeFilename = (originalName) => {
  const baseName = path.parse(originalName || "").name;
  const normalized = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "avatar";
};

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadsDir));
app.use(express.static(distDir));

app.get("/api/people", async (_req, res) => {
  try {
    const rows = await all("SELECT * FROM people ORDER BY name");
    res.json(rows.map(normalizePerson));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/people", async (req, res) => {
  try {
    const person = normalizePerson(req.body || {});
    if (!person.id) {
      res.status(400).json({ error: "id is required" });
      return;
    }
    await insertPerson(person);
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/people/:id", async (req, res) => {
  try {
    const person = normalizePerson({ ...req.body, id: req.params.id });
    if (!person.id) {
      res.status(400).json({ error: "id is required" });
      return;
    }
    await insertPerson(person);
    res.json(person);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/people/:id", async (req, res) => {
  try {
    await run("DELETE FROM people WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/import", memoryUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "CSV file is required" });
      return;
    }
    const mode = req.query.mode === "merge" ? "merge" : "replace";
    const text = req.file.buffer.toString("utf8");
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    const people = parsed.data.map(normalizePerson).filter((item) => item.id);
    if (mode === "replace") {
      await run("DELETE FROM people");
    }
    for (const person of people) {
      await insertPerson(person);
    }
    res.json({ count: people.length, mode });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/export", async (_req, res) => {
  try {
    const rows = await all("SELECT * FROM people ORDER BY name");
    const csv = Papa.unparse(rows, { columns: personFields });
    res.set("Content-Type", "text/csv");
    res.set("Content-Disposition", "attachment; filename=people.csv");
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/uploads", avatarUpload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Image file is required" });
      return;
    }
    if (!req.file.mimetype?.startsWith("image/")) {
      res.status(400).json({ error: "Only image uploads are supported" });
      return;
    }
    const name = formalizeFilename(req.body?.name || req.file.originalname);
    const filename = `${Date.now()}-${name}.jpg`;
    const outputPath = path.join(uploadsDir, filename);

    await sharp(req.file.buffer).rotate().jpeg({ quality: 90 }).toFile(outputPath);

    res.json({ url: `/uploads/${filename}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
    next();
    return;
  }
  res.sendFile(path.join(distDir, "index.html"));
});

const start = async () => {
  await ensureDir();
  db = new Database(dbPath);
  await initDb();
  app.listen(PORT, () => {
    console.log(`Geo Family API listening on ${PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
