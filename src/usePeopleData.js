import Papa from "papaparse";
import { useCallback, useMemo, useState } from "react";

const DB_NAME = "geo-family";
const STORE_NAME = "people";
const DB_VERSION = 1;

export const PERSON_FIELDS = [
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

const normalizeId = (value) => (value ? value.trim() : "");

export const normalizePerson = (row) => ({
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

export const createEmptyPerson = () => ({
  id: "",
  name: "",
  birth_day: "",
  death_day: "",
  birth_place: "",
  father: "",
  mother: "",
  avatar_url: "",
  info: "",
});

export const slugifyId = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const openDb = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const getAllPeople = (db) =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

const putPerson = (db, person) =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(person);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

const deletePerson = (db, id) =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

const replaceAllPeople = (db, people) =>
  new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const clearRequest = store.clear();
    clearRequest.onerror = () => reject(clearRequest.error);
    clearRequest.onsuccess = () => {
      people.forEach((person) => store.put(person));
    };
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });

const parseCsvText = (text) => {
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
  return parsed.data.map(normalizePerson).filter((item) => item.id);
};

const buildCsvText = (people) =>
  Papa.unparse(
    people.map((person) => ({
      id: person.id,
      name: person.name,
      birth_day: person.birth_day,
      death_day: person.death_day,
      birth_place: person.birth_place,
      father: person.father,
      mother: person.mother,
      avatar_url: person.avatar_url,
      info: person.info,
    })),
    { columns: PERSON_FIELDS },
  );

export const usePeopleData = () => {
  const mode = (import.meta.env.VITE_DATA_MODE || "local").toLowerCase();
  const dataMode = mode === "api" ? "api" : "local";
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiUrl = useCallback(
    (path) => `${apiBase}${path}`,
    [apiBase],
  );

  const loadPeople = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (dataMode === "api") {
        const response = await fetch(apiUrl("/api/people"));
        if (!response.ok) {
          throw new Error("Failed to load people");
        }
        const data = await response.json();
        setPeople(data.map(normalizePerson));
      } else {
        const db = await openDb();
        const stored = await getAllPeople(db);
        if (!stored.length) {
          const response = await fetch("/people.csv");
          const text = await response.text();
          const parsed = parseCsvText(text);
          await replaceAllPeople(db, parsed);
          setPeople(parsed);
        } else {
          setPeople(stored.map(normalizePerson));
        }
      }
    } catch (err) {
      setError(err?.message || "Failed to load people");
    } finally {
      setLoading(false);
    }
  }, [apiUrl, dataMode]);

  const createPerson = useCallback(
    async (person) => {
      const normalized = normalizePerson(person);
      if (dataMode === "api") {
        const response = await fetch(apiUrl("/api/people"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(normalized),
        });
        if (!response.ok) {
          throw new Error("Failed to create person");
        }
        const saved = normalizePerson(await response.json());
        setPeople((prev) => [...prev, saved]);
        return saved;
      }
      const db = await openDb();
      await putPerson(db, normalized);
      setPeople((prev) => [...prev, normalized]);
      return normalized;
    },
    [apiUrl, dataMode],
  );

  const updatePerson = useCallback(
    async (person) => {
      const normalized = normalizePerson(person);
      if (dataMode === "api") {
        const response = await fetch(apiUrl(`/api/people/${normalized.id}`), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(normalized),
        });
        if (!response.ok) {
          throw new Error("Failed to update person");
        }
        const saved = normalizePerson(await response.json());
        setPeople((prev) =>
          prev.map((item) => (item.id === saved.id ? saved : item)),
        );
        return saved;
      }
      const db = await openDb();
      await putPerson(db, normalized);
      setPeople((prev) =>
        prev.map((item) => (item.id === normalized.id ? normalized : item)),
      );
      return normalized;
    },
    [apiUrl, dataMode],
  );

  const removePerson = useCallback(
    async (id) => {
      if (dataMode === "api") {
        const response = await fetch(apiUrl(`/api/people/${id}`), {
          method: "DELETE",
        });
        if (!response.ok) {
          throw new Error("Failed to delete person");
        }
        setPeople((prev) => prev.filter((item) => item.id !== id));
        return;
      }
      const db = await openDb();
      await deletePerson(db, id);
      setPeople((prev) => prev.filter((item) => item.id !== id));
    },
    [apiUrl, dataMode],
  );

  const importCsv = useCallback(
    async (file, mode = "replace") => {
      if (!file) return;
      if (dataMode === "api") {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch(
          apiUrl(`/api/import?mode=${mode === "merge" ? "merge" : "replace"}`),
          { method: "POST", body: form },
        );
        if (!response.ok) {
          throw new Error("Failed to import CSV");
        }
        await loadPeople();
        return;
      }
      const text = await file.text();
      const parsed = parseCsvText(text);
      const db = await openDb();
      await replaceAllPeople(db, parsed);
      setPeople(parsed);
    },
    [apiUrl, dataMode, loadPeople],
  );

  const exportCsv = useCallback(async () => {
    if (dataMode === "api") {
      const response = await fetch(apiUrl("/api/export"));
      if (!response.ok) {
        throw new Error("Failed to export CSV");
      }
      return response.text();
    }
    return buildCsvText(people);
  }, [apiUrl, dataMode, people]);

  const uploadAvatar = useCallback(
    async (file) => {
      if (!file || dataMode !== "api") return "";
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(apiUrl("/api/uploads"), {
        method: "POST",
        body: form,
      });
      if (!response.ok) {
        throw new Error("Failed to upload avatar");
      }
      const data = await response.json();
      return data.url || "";
    },
    [apiUrl, dataMode],
  );

  const data = useMemo(
    () => ({
      people,
      loading,
      error,
      dataMode,
      loadPeople,
      createPerson,
      updatePerson,
      removePerson,
      importCsv,
      exportCsv,
      uploadAvatar,
    }),
    [
      people,
      loading,
      error,
      dataMode,
      loadPeople,
      createPerson,
      updatePerson,
      removePerson,
      importCsv,
      exportCsv,
      uploadAvatar,
    ],
  );

  return data;
};
