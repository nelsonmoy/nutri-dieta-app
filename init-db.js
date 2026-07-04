const Database = require("better-sqlite3");

const db = new Database("database.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS dietas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    tiempo TEXT NOT NULL,
    grupo TEXT NOT NULL,
    porciones REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS equivalentes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grupo TEXT NOT NULL,
    alimento TEXT NOT NULL,
    descripcion TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS resumenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario TEXT NOT NULL,
    tiempo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    actualizado_en TEXT NOT NULL,
    UNIQUE(usuario, tiempo)
  );
`);

db.prepare("DELETE FROM dietas").run();
db.prepare("DELETE FROM equivalentes").run();

const insertarDieta = db.prepare(
  "INSERT INTO dietas(usuario, tiempo, grupo, porciones) VALUES(?, ?, ?, ?)"
);
const insertarEquivalente = db.prepare(
  "INSERT INTO equivalentes(grupo, alimento, descripcion) VALUES(?, ?, ?)"
);

const dietasOrigen = [
  ["nelson", "desayuno", "leche desc.", 1],
  ["nelson", "desayuno", "carnes", 2],
  ["nelson", "desayuno", "cereales", 3],
  ["nelson", "desayuno", "verduras", 2],
  ["nelson", "desayuno", "frutas", 1.5],
  ["nelson", "desayuno", "grasas", 1],
  ["nelson", "desayuno", "azucares", 1],
  ["nelson", "comida", "agua pura", -1],
  ["nelson", "comida", "carnes", 3],
  ["nelson", "comida", "cereales", 4],
  ["nelson", "comida", "leguminosas", 1],
  ["nelson", "comida", "verduras", 2],
  ["nelson", "comida", "frutas", 2],
  ["nelson", "comida", "grasas", 1],
  ["nelson", "comida", "azucares", 1],
  ["nelson", "cena", "leche desc.", 1],
  ["nelson", "cena", "carnes", 2],
  ["nelson", "cena", "cereales", 2],
  ["nelson", "cena", "verduras", 1],
  ["nelson", "cena", "frutas", 1]
];

const catalogoEquivalentes = {
  "leche desc.": [
    ["Leche Descremada Light", 240, "ml"],
    ["Yogurt Natural", 200, "gr"]
  ],
  carnes: [
    ["Res", 30, "gr"],
    ["Pollo", 30, "gr"],
    ["Pavo", 40, "gr"],
    ["Pescado", 40, "gr"],
    ["Atun en agua", 40, "gr"],
    ["Huevo", 1, "pieza"],
    ["Claras de huevo", 2, "piezas"],
    ["Queso fresco", 40, "gr"],
    ["Queso panela", 50, "gr"],
    ["Queso cottage", 50, "gr"]
  ],
  cereales: [
    ["Tortilla de maiz", 1, "pieza (30 gr)"],
    ["Arroz cocido", 0.5, "taza"],
    ["Avena cocida", 0.5, "taza"],
    ["Hojuelas de maiz", 0.5, "taza"],
    ["Pastas cocidas", 0.5, "taza"],
    ["Totopo sin grasa", 1, "pza chica"],
    ["Pan blanco", 1, "rebanada"],
    ["Galletas animalit", 6, "piezas"],
    ["Galletas saladas", 4, "piezas"],
    ["Yuca", 0.5, "taza"],
    ["Bollo hamburguesa", 0.5, "pieza"],
    ["Pan medias noches", 0.5, "pieza"],
    ["Telera", 0.5, "pieza"],
    ["Granola", 0.25, "taza"],
    ["Amaranto tostado", 0.333, "taza"],
    ["Galletas salmas", 1, "paq. (3 piezas)"],
    ["Galleras Marias", 5, "piezas"],
    ["Galleras Habaneras", 4, "piezas"],
    ["Harina de trigo, arroz", 2, "cdas"],
    ["Pan molido", 3, "cdas"],
    ["Papa cocida (100 gr)", 1, "pieza"],
    ["Pan tostado", 1, "rebanada"],
    ["Pan integral", 1, "rebanada"],
    ["Bolillo s/migajon", 0.5, "pieza"],
    ["Elote cocido", 0.333, "pieza"],
    ["Camote", 0.5, "taza"],
    ["Hot Cake Casero (40 gr)", 1, "pieza"],
    ["Pinole", 2, "cdas"],
    ["Pambazo", 0.5, "pieza"],
    ["Tortillas de Harina", 1, "pieza"],
    ["Palomitas naturales", 2.5, "tazas"],
    ["Tostadas horneadas", 1.5, "pieza"]
  ],
  leguminosas: [
    ["Frijol", 0.5, "taza"],
    ["Lentejas", 0.5, "taza"],
    ["Garbanzo", 0.5, "taza"],
    ["Habas", 0.5, "taza"],
    ["Soya", 0.5, "taza"]
  ],
  verduras: [
    ["Betabel", 50, "gr"],
    ["Cebolla", 50, "gr"],
    ["Chile poblano", 50, "gr"],
    ["Habas verdes", 50, "gr"],
    ["Zanahoria", 50, "gr"],
    ["Soya germinada", 50, "gr"],
    ["Chicharos", 50, "gr"],
    ["Calabacita criolla", 50, "gr"],
    ["Acelga", 100, "gr"],
    ["Col", 100, "gr"],
    ["Ejote", 100, "gr"],
    ["Jitomate", 100, "gr"],
    ["Berenjena", 100, "gr"],
    ["Esparragos", 100, "gr"],
    ["Rabanos", 100, "gr"],
    ["Alfalfa", 100, "gr"],
    ["Jicama", 100, "gr"],
    ["Champinones", 100, "gr"],
    ["Chayote", 100, "gr"],
    ["Lechuga romana", 100, "gr"],
    ["Verdolaga", 100, "gr"],
    ["Quelites", 100, "gr"],
    ["Coliflor", 100, "gr"],
    ["Chaya", 100, "gr"],
    ["Pimiento morron", 100, "gr"],
    ["Lechuga orejona", 100, "gr"],
    ["Berro", 100, "gr"],
    ["Chilacayote", 100, "gr"],
    ["Pacaya", 100, "gr"],
    ["Yerbamora", 100, "gr"],
    ["Apio", 100, "gr"],
    ["Chipilin", 100, "gr"],
    ["Pepino", 100, "gr"],
    ["Perejil", 100, "gr"],
    ["Poro", 100, "gr"],
    ["Calabacita", 100, "gr"],
    ["Espinacas", 100, "gr"],
    ["Flor de calabaza", 100, "gr"],
    ["Nabo", 100, "gr"],
    ["Brocoli", 100, "gr"],
    ["Nopales", 100, "gr"],
    ["Cilantro", 100, "gr"],
    ["Bledo", 100, "gr"],
    ["Macus", 100, "gr"]
  ],
  frutas: [
    ["Carambola", 1.5, "piezas"],
    ["Ciruela fresca", 3, "piezas"],
    ["Frambuesa", 120, "gr"],
    ["Guayaba", 3, "piezas"],
    ["Higo", 2, "piezas"],
    ["Lima", 2, "medianas"],
    ["Mamey", 0.333, "pieza"],
    ["Mango", 1, "pieza"],
    ["Manzana", 1, "pieza chica"],
    ["Nanche", 1.5, "taza"],
    ["Papaya", 1, "taza"],
    ["Pina", 0.75, "taza"],
    ["Sandia", 1, "taza"],
    ["Melon", 1.5, "taza"],
    ["Uvas", 12, "piezas"],
    ["Zapote", 0.25, "pieza"],
    ["Chicozapote", 100, "gr"],
    ["Kiwi", 1.5, "piezas"],
    ["Rambutan", 7, "piezas"],
    ["Uva sin semilla", 1, "taza"],
    ["Moras", 100, "gr"],
    ["Arandanos", 150, "gr"],
    ["Caimito", 2, "piezas"],
    ["Cerezas (90 gr)", 20, "piezas"],
    ["Ciruelas pasas", 7, "piezas"],
    ["Durazno", 2, "piezas"],
    ["Fresas", 1, "taza"],
    ["Granadilla", 2, "piezas"],
    ["Agua de coco", 1.5, "tazas"],
    ["Limon", 4, "piezas"],
    ["Mandarina", 2, "piezas"],
    ["Maranon", 1, "pieza"],
    ["Toronja", 1, "pieza"],
    ["Naranja", 2, "piezas"],
    ["Pera", 1, "pieza"],
    ["Platano (guineo)", 0.5, "pieza"],
    ["Tejocote", 2, "piezas"],
    ["Tuna", 2, "piezas"],
    ["Guanabana", 250, "gr"],
    ["Platano macho", 0.25, "pieza"],
    ["Pasitas", 10, "piezas"],
    ["Zarzamora", 1, "taza"],
    ["Grosellas (150 gr)", 1, "taza"],
    ["Anona", 130, "gr"]
  ],
  grasas: [
    ["Aceite de oliva", 1, "cucharadita"],
    ["Aceite de aguacate", 1, "cucharadita"],
    ["Aceite de coco", 1, "cucharadita"],
    ["Aceite en spray", 5, "disparos de 1 segundo"],
    ["Margarina", 2, "cucharaditas"],
    ["Aderezo", 2, "cucharaditas"],
    ["Aceitunas", 6, "piezas pequenas"],
    ["Aguacate Hass", 0.25, "pieza"],
    ["Almendras", 6, "piezas enteras"],
    ["Avellanas", 2, "cucharadas"],
    ["Cacahuate", 14, "piezas"],
    ["Nuez", 2, "piezas enteras"],
    ["Pistache", 10, "piezas"],
    ["Semilla de calabaza", 2, "cucharadas"],
    ["Semilla de maranon", 4, "piezas enteras"],
    ["Pinon", 2, "cucharaditas"]
  ],
  azucares: [
    ["Azucar", 1, "cucharada (10 gr)"],
    ["Gomitas", 4, "piezas"],
    ["Salsa catsup", 2, "cucharadas"],
    ["Caramelo", 2, "piezas"],
    ["Cafe capuchino", 0.333, "taza"],
    ["Bombones", 2, "piezas"],
    ["Chicle", 4, "piezas"],
    ["Chicloso", 1, "pieza"],
    ["Gelatina", 0.5, "taza"],
    ["Nieve", 1, "bola de 50 gr"],
    ["Miel de abeja", 2, "cucharaditas"],
    ["Pan dulce", 20, "gr"],
    ["Paleta de hielo", 1, "pieza"],
    ["Paleta de fruta", 0.5, "pieza"],
    ["Flan", 0.25, "taza"],
    ["Ate", 15, "gr"],
    ["Mermelada", 1, "cucharada de 10 gr"],
    ["Pastel", 1, "rebanada de 30 gr"],
    ["Chocolate", 2, "cucharadas"],
    ["Bebida lactea fermentada (yakul, chamito, bio-4)", 1, "pieza"],
    ["Cajeta", 1.5, "cucharadita"],
    ["Jalea", 2, "cucharaditas"]
  ]
};

const aliasGrupos = {
  "leche desc": "leche",
  "leche desc.": "leche"
};

function normalizarGrupo(grupo) {
  const limpio = String(grupo).trim().toLowerCase();
  return aliasGrupos[limpio] ?? limpio;
}

function aDescripcion(cantidad, unidad) {
  return `${cantidad} ${unidad}`.trim();
}

const dietas = dietasOrigen
  .map(([usuario, tiempo, grupo, porciones]) => [
    usuario,
    tiempo,
    normalizarGrupo(grupo),
    porciones
  ])
  .filter(([, , grupo, porciones]) => grupo !== "agua pura" && porciones > 0);

const equivalentes = Object.entries(catalogoEquivalentes).flatMap(([grupo, items]) =>
  items.map(([alimento, cantidad, unidad]) => [
    normalizarGrupo(grupo),
    alimento,
    aDescripcion(cantidad, unidad)
  ])
);

const poblarDatos = db.transaction(() => {
  dietas.forEach((registro) => insertarDieta.run(...registro));
  equivalentes.forEach((registro) => insertarEquivalente.run(...registro));
});

poblarDatos();
db.close();

console.log("DB lista con equivalentes completos");
