const express = require("express");
const Database = require("better-sqlite3");

const app = express();
const db = new Database("database.db");
const apiAccessToken = process.env.API_ACCESS_TOKEN || "nutri-dieta-dev-token";
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";

db.exec(`
  CREATE TABLE IF NOT EXISTS resumenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    tiempo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    actualizado_en TEXT NOT NULL,
    UNIQUE(usuario, tiempo)
  );

  CREATE TABLE IF NOT EXISTS historial_menus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    tiempo TEXT NOT NULL,
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    creado_en TEXT NOT NULL
  );
`);

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
});

app.use(express.static("public"));
app.use(express.json());

app.get("/api", (req, res) => {
  res.json({
    ok: true,
    auth: "Bearer token",
    endpoints: [
      "/api/dieta/:usuario/:tiempo",
      "/api/equivalentes",
      "/api/resumen/:usuario/:tiempo",
      "/api/resumen",
      "/api/historial/:usuario/:tiempo",
      "/api/historial"
    ]
  });
});

app.use("/api", (req, res, next) => {
  if (req.path === "") {
    next();
    return;
  }

  const authHeader = req.get("Authorization") || "";
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  const queryToken = typeof req.query.access_token === "string" ? req.query.access_token : "";
  const providedToken = bearerToken || queryToken;

  if (providedToken !== apiAccessToken) {
    res.status(401).json({ error: "Token de acceso invalido." });
    return;
  }

  next();
});

app.get("/api/dieta/:usuario/:tiempo", (req, res) => {
  try {
    const rows = db
      .prepare(
        "SELECT grupo, porciones FROM dietas WHERE usuario = ? AND tiempo = ? ORDER BY id"
      )
      .all(req.params.usuario, req.params.tiempo);

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "No se pudo consultar la dieta." });
  }
});

app.get("/api/equivalentes", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT id, grupo, alimento, descripcion FROM equivalentes ORDER BY grupo, alimento")
      .all();

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "No se pudieron consultar los equivalentes." });
  }
});

app.get("/api/resumen/:usuario/:tiempo", (req, res) => {
  try {
    const row = db
      .prepare(
        "SELECT usuario, tiempo, contenido, actualizado_en FROM resumenes WHERE usuario = ? AND tiempo = ?"
      )
      .get(req.params.usuario, req.params.tiempo);

    if (!row) {
      res.json(null);
      return;
    }

    res.json({
      ...row,
      contenido: JSON.parse(row.contenido)
    });
  } catch (error) {
    res.status(500).json({ error: "No se pudo consultar el resumen guardado." });
  }
});

app.post("/api/resumen", (req, res) => {
  const { usuario, tiempo, contenido } = req.body ?? {};

  if (!usuario || !tiempo || !Array.isArray(contenido)) {
    res.status(400).json({ error: "Los datos del resumen no son validos." });
    return;
  }

  try {
    const serializado = JSON.stringify(contenido);

    db.prepare(
      `
        INSERT INTO resumenes (usuario, tiempo, contenido, actualizado_en)
        VALUES (?, ?, ?, datetime('now'))
        ON CONFLICT(usuario, tiempo)
        DO UPDATE SET
          contenido = excluded.contenido,
          actualizado_en = datetime('now')
      `
    ).run(usuario, tiempo, serializado);

    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: "No se pudo guardar el resumen." });
  }
});

app.get("/api/historial/:usuario/:tiempo", (req, res) => {
  try {
    const rows = db
      .prepare(
        `
          SELECT id, usuario, tiempo, titulo, contenido, creado_en
          FROM historial_menus
          WHERE usuario = ? AND tiempo = ?
          ORDER BY datetime(creado_en) DESC, id DESC
        `
      )
      .all(req.params.usuario, req.params.tiempo)
      .map((row) => ({
        ...row,
        contenido: JSON.parse(row.contenido)
      }));

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "No se pudo consultar el historial de menus." });
  }
});

app.post("/api/historial", (req, res) => {
  const { usuario, tiempo, titulo, contenido } = req.body ?? {};

  if (!usuario || !tiempo || !titulo || !Array.isArray(contenido)) {
    res.status(400).json({ error: "Los datos del historial no son validos." });
    return;
  }

  try {
    const serializado = JSON.stringify(contenido);
    const result = db
      .prepare(
        `
          INSERT INTO historial_menus (usuario, tiempo, titulo, contenido, creado_en)
          VALUES (?, ?, ?, ?, datetime('now'))
        `
      )
      .run(usuario, tiempo, titulo, serializado);

    res.json({ ok: true, id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: "No se pudo guardar el historial del menu." });
  }
});

app.put("/api/historial/:id", (req, res) => {
  const id = Number(req.params.id);
  const { usuario, tiempo, titulo, contenido } = req.body ?? {};

  if (!id || !usuario || !tiempo || !titulo || !Array.isArray(contenido)) {
    res.status(400).json({ error: "Los datos para actualizar el menu no son validos." });
    return;
  }

  try {
    const serializado = JSON.stringify(contenido);
    const result = db
      .prepare(
        `
          UPDATE historial_menus
          SET usuario = ?, tiempo = ?, titulo = ?, contenido = ?, creado_en = datetime('now')
          WHERE id = ?
        `
      )
      .run(usuario, tiempo, titulo, serializado, id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Menu no encontrado." });
      return;
    }

    res.json({ ok: true, id });
  } catch (error) {
    res.status(500).json({ error: "No se pudo actualizar el menu." });
  }
});

app.delete("/api/historial/:id", (req, res) => {
  const id = Number(req.params.id);

  if (!id) {
    res.status(400).json({ error: "Id de menu invalido." });
    return;
  }

  try {
    const result = db.prepare("DELETE FROM historial_menus WHERE id = ?").run(id);

    if (result.changes === 0) {
      res.status(404).json({ error: "Menu no encontrado." });
      return;
    }

    res.json({ ok: true, id });
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar el menu." });
  }
});

app.listen(3000, () => {
  console.log("App lista en http://localhost:3000");
  console.log(`API token configurado: ${apiAccessToken}`);
});
