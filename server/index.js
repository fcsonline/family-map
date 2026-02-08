import cors from "cors";
import express from "express";
import multer from "multer";
import Papa from "papaparse";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import sqlite3 from "sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const dataDir = process.env.DATA_DIR || path.join(process.cwd(), "data");
const uploadsDir = path.join(dataDir, "uploads");
const dbPath = path.join(dataDir, "geo-family.db");
const distDir = path.join(__dirname, "..", "dist");

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

const db = new sqlite3.Database(dbPath);
const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });

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
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "-");
      cb(null, `${Date.now()}-${safeName}`);
    },
  }),
});

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
    res.json({ url: `/uploads/${req.file.filename}` });
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
  await initDb();
  app.listen(PORT, () => {
    console.log(`Geo Family API listening on ${PORT}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
