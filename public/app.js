const estado = document.getElementById("estado");
const validation = document.getElementById("validation");
const cards = document.getElementById("cards");
const savedSummary = document.getElementById("saved-summary");
const savedSummaryDate = document.getElementById("saved-summary-date");
const savedSummaryContent = document.getElementById("saved-summary-content");
const historySection = document.getElementById("history");
const historyCount = document.getElementById("history-count");
const historyContent = document.getElementById("history-content");
const summary = document.getElementById("summary");
const summaryContent = document.getElementById("summary-content");
const menuTitleInput = document.getElementById("menu-title");
const verBtn = document.getElementById("ver-btn");
const actualizarResumenBtn = document.getElementById("actualizar-resumen");
const guardarResumenBtn = document.getElementById("guardar-resumen");
const apiToken = localStorage.getItem("nutri_api_token") || "nutri-dieta-dev-token";

let seleccionActual = [];
let historialActual = [];
let editingHistoryId = null;

verBtn.addEventListener("click", cargar);
actualizarResumenBtn.addEventListener("click", recargarResumenGuardado);
guardarResumenBtn.addEventListener("click", guardarResumen);
window.addEventListener("DOMContentLoaded", cargar);

async function cargar() {
  const usuario = document.getElementById("usuario").value;
  const tiempo = document.getElementById("tiempo").value;

  resetVista();

  try {
    const [dieta, equivalentes, resumenGuardado, historial] = await Promise.all([
      apiFetch(`/api/dieta/${usuario}/${tiempo}`),
      apiFetch("/api/equivalentes"),
      apiFetch(`/api/resumen/${usuario}/${tiempo}`),
      apiFetch(`/api/historial/${usuario}/${tiempo}`)
    ]);

    if (!dieta.length) {
      estado.textContent = "No hay una dieta registrada para esta seleccion.";
      return;
    }

    seleccionActual = construirSeleccion(dieta, equivalentes, resumenGuardado?.contenido ?? []);
    historialActual = historial;
    renderCards();
    renderResumen();
    renderResumenGuardado(resumenGuardado);
    renderHistorial(historialActual);
    estado.textContent = "Toca los equivalentes para sumar o restar porciones.";
  } catch (error) {
    estado.textContent = "No se pudo cargar la informacion de la dieta.";
  }
}

function resetVista() {
  editingHistoryId = null;
  guardarResumenBtn.textContent = "Guardar";
  menuTitleInput.value = "";
  estado.textContent = "Cargando plan...";
  cards.innerHTML = "";
  summary.classList.add("hidden");
  summaryContent.innerHTML = "";
  savedSummary.classList.add("hidden");
  savedSummaryContent.innerHTML = "";
  savedSummaryDate.textContent = "";
  historySection.classList.add("hidden");
  historyContent.innerHTML = "";
  historyCount.textContent = "";
  validation.classList.add("hidden");
  validation.textContent = "";
}

function validarRespuesta(response) {
  if (!response.ok) {
    throw new Error("Respuesta no valida");
  }

  return response.json();
}

function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${apiToken}`);

  return fetch(url, {
    ...options,
    headers
  }).then(validarRespuesta);
}

function construirSeleccion(dieta, equivalentes, resumenGuardado) {
  return dieta
    .filter((item) => item.porciones > 0)
    .map((item) => {
      const cantidades = hidratarCantidades(item.grupo, equivalentes, resumenGuardado);
      const completo = redondearCantidad(item.porciones - totalSeleccionadoDesdeCantidades(cantidades)) === 0;

      return {
        grupo: item.grupo,
        porciones: item.porciones,
        opciones: equivalentes.filter((equivalente) => equivalente.grupo === item.grupo),
        cantidades,
        collapsed: completo,
        filtro: ""
      };
    });
}

function renderCards() {
  cards.innerHTML = "";

  seleccionActual.forEach((item, itemIndex) => {
    const total = totalSeleccionado(item);
    const card = document.createElement("article");
    card.className = `card ${item.collapsed ? "is-collapsed" : ""}`;

    const resumenGrupo = detalleResumen(item)
      .map((detalle) => `${detalle.alimento}: ${calcularCantidadMostrada(detalle.cantidad, detalle.descripcion)}`)
      .join(" | ");

    const header = document.createElement("div");
    header.className = "card-header";
    header.innerHTML = `
      <div class="card-header-main">
        <button type="button" class="card-toggle" data-item-index="${itemIndex}">
          <strong>${icono(item.grupo)} ${capitalizar(item.grupo)}</strong>
          <span>${item.collapsed ? "Expandir" : "Colapsar"}</span>
        </button>
        <p>Porciones requeridas: ${formatearPorciones(item.porciones)}</p>
        ${resumenGrupo ? `<p class="group-summary">${resumenGrupo}</p>` : ""}
      </div>
      <span class="badge">${formatearPorciones(total)} de ${formatearPorciones(item.porciones)}</span>
    `;
    card.appendChild(header);

    const optionList = document.createElement("div");
    optionList.className = `option-list ${item.collapsed ? "hidden" : ""}`;

    const search = document.createElement("div");
    search.className = "category-search";
    search.innerHTML = `
      <input
        type="search"
        class="category-search-input"
        data-item-index="${itemIndex}"
        placeholder="Buscar en ${capitalizar(item.grupo)}"
        value="${escapeHtml(item.filtro)}"
      />
    `;
    optionList.appendChild(search);

    const opcionesFiltradas = item.opciones.filter((opcion) => coincideFiltro(opcion, item.filtro));

    if (!item.opciones.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "Sin equivalentes disponibles para este grupo.";
      optionList.appendChild(empty);
    }

    if (item.opciones.length && !opcionesFiltradas.length) {
      const emptyFiltered = document.createElement("p");
      emptyFiltered.className = "empty-state";
      emptyFiltered.textContent = "No hay resultados para esta busqueda.";
      optionList.appendChild(emptyFiltered);
    }

    opcionesFiltradas.forEach((opcion) => {
      const cantidad = item.cantidades[opcion.id] ?? 0;
      const optionCard = document.createElement("div");
      optionCard.className = "option-card";
      optionCard.innerHTML = `
        <button type="button" class="option-main" data-action="sumar" data-item-index="${itemIndex}" data-option-id="${opcion.id}">
          <strong>${opcion.alimento}</strong>
          <span>${opcion.descripcion}</span>
        </button>
        <div class="counter">
          <button type="button" class="counter-btn" data-action="restar" data-item-index="${itemIndex}" data-option-id="${opcion.id}">-</button>
          <span class="counter-value">${formatearPorciones(cantidad)}</span>
          <button type="button" class="counter-btn" data-action="sumar" data-item-index="${itemIndex}" data-option-id="${opcion.id}">+</button>
        </div>
      `;
      optionList.appendChild(optionCard);
    });

    card.appendChild(optionList);
    cards.appendChild(card);
  });

  cards.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", actualizarCantidad);
  });

  cards.querySelectorAll(".card-toggle").forEach((button) => {
    button.addEventListener("click", toggleGrupo);
  });

  cards.querySelectorAll(".category-search-input").forEach((input) => {
    input.addEventListener("input", actualizarFiltroCategoria);
  });
}

function toggleGrupo(event) {
  const itemIndex = Number(event.currentTarget.dataset.itemIndex);
  seleccionActual[itemIndex].collapsed = !seleccionActual[itemIndex].collapsed;
  renderCards();
}

function actualizarCantidad(event) {
  const itemIndex = Number(event.currentTarget.dataset.itemIndex);
  const optionId = Number(event.currentTarget.dataset.optionId);
  const action = event.currentTarget.dataset.action;
  const item = seleccionActual[itemIndex];
  const actual = item.cantidades[optionId] ?? 0;
  const paso = pasoGrupo(item.porciones);
  const total = totalSeleccionado(item);
  const disponible = Math.max(0, redondearCantidad(item.porciones - total));

  if (action === "sumar") {
    if (disponible <= 0) {
      estado.textContent = `Ya completaste las porciones del grupo ${capitalizar(item.grupo)}.`;
      return;
    }

    item.cantidades[optionId] = redondearCantidad(actual + Math.min(paso, disponible));
  }

  if (action === "restar") {
    if (actual <= 0) {
      return;
    }

    const nuevoValor = redondearCantidad(actual - Math.min(paso, actual));
    if (nuevoValor <= 0) {
      delete item.cantidades[optionId];
    } else {
      item.cantidades[optionId] = nuevoValor;
    }
  }

  item.collapsed = redondearCantidad(item.porciones - totalSeleccionado(item)) === 0;
  renderCards();
  renderResumen();
}

function actualizarFiltroCategoria(event) {
  const itemIndex = Number(event.currentTarget.dataset.itemIndex);
  seleccionActual[itemIndex].filtro = event.currentTarget.value;
  const activeElement = document.activeElement;
  const cursorStart = event.currentTarget.selectionStart;
  const cursorEnd = event.currentTarget.selectionEnd;

  renderCards();

  const nextInput = document.querySelector(`.category-search-input[data-item-index="${itemIndex}"]`);
  if (nextInput) {
    nextInput.focus();
    if (activeElement === event.currentTarget && cursorStart !== null && cursorEnd !== null) {
      nextInput.setSelectionRange(cursorStart, cursorEnd);
    }
  }
}

function totalSeleccionado(item) {
  return totalSeleccionadoDesdeCantidades(item.cantidades);
}

function totalSeleccionadoDesdeCantidades(cantidades) {
  return redondearCantidad(
    Object.values(cantidades).reduce((total, cantidad) => total + cantidad, 0)
  );
}

function detalleResumen(item) {
  return item.opciones.flatMap((opcion) => {
    const cantidad = item.cantidades[opcion.id] ?? 0;
    if (!cantidad) {
      return [];
    }

    return [{
      grupo: item.grupo,
      alimento: opcion.alimento,
      descripcion: opcion.descripcion,
      cantidad,
      equivalenteId: opcion.id
    }];
  });
}

function renderResumen() {
  const tiempo = capitalizar(document.getElementById("tiempo").value);
  const validacion = construirValidacion();
  const filas = seleccionActual.flatMap((item) =>
    detalleResumen(item).map((detalle) => `
      <tr>
        <td>${capitalizar(detalle.grupo)}</td>
        <td>${detalle.alimento}</td>
        <td>${calcularCantidadMostrada(detalle.cantidad, detalle.descripcion)}</td>
      </tr>
    `)
  );

  renderValidacion(validacion);

  if (!filas.length) {
    summary.classList.add("hidden");
    summaryContent.innerHTML = "";
    return;
  }

  summary.classList.remove("hidden");
  summaryContent.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>${tiempo}</th>
          <th>Alimento</th>
          <th>Cantidad</th>
        </tr>
      </thead>
      <tbody>${filas.join("")}</tbody>
    </table>
    <p class="summary-note">${validacion.completa ? "Raciones completas." : "Aun faltan raciones por completar."}</p>
  `;
}

function renderValidacion(validacion) {
  validation.classList.remove("hidden");
  validation.className = `validation ${validacion.completa ? "is-ok" : "is-warning"}`;
  validation.innerHTML = validacion.detalles
    .map((detalle) => {
      const estadoGrupo = detalle.completo ? "completo" : `faltan ${detalle.faltante}`;
      return `<p><strong>${capitalizar(detalle.grupo)}:</strong> ${detalle.seleccionadas} de ${detalle.requeridas} porciones, ${estadoGrupo}.</p>`;
    })
    .join("");
}

function construirValidacion() {
  const detalles = seleccionActual.map((item) => {
    const seleccionadas = totalSeleccionado(item);
    const requeridas = item.porciones;
    const faltante = Math.max(0, redondearCantidad(requeridas - seleccionadas));

    return {
      grupo: item.grupo,
      seleccionadas: formatearPorciones(seleccionadas),
      requeridas: formatearPorciones(requeridas),
      faltante: formatearPorciones(faltante),
      completo: faltante === 0
    };
  });

  return { detalles, completa: detalles.every((detalle) => detalle.completo) };
}

async function guardarResumen() {
  const usuario = document.getElementById("usuario").value;
  const tiempo = document.getElementById("tiempo").value;
  const validacion = construirValidacion();
  const contenido = construirContenido();
  const titulo = menuTitleInput.value.trim() || construirTituloMenu(tiempo, contenido);

  if (!contenido.length) {
    estado.textContent = "No hay selecciones para guardar.";
    return;
  }

  try {
    await apiFetch("/api/resumen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, tiempo, contenido })
    });

    if (editingHistoryId) {
      await apiFetch(`/api/historial/${editingHistoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, tiempo, titulo, contenido })
      });
    } else {
      await apiFetch("/api/historial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, tiempo, titulo, contenido })
      });
    }

    await recargarResumenGuardado(false);
    await recargarHistorial(false);
    editingHistoryId = null;
    guardarResumenBtn.textContent = "Guardar";
    menuTitleInput.value = "";
    estado.textContent = validacion.completa
      ? "Menu guardado correctamente."
      : "Menu guardado, pero aun hay raciones pendientes.";
  } catch (error) {
    estado.textContent = "No se pudo guardar el menu.";
  }
}

function construirContenido() {
  return seleccionActual.flatMap((item, itemIndex) =>
    detalleResumen(item).map((detalle, detalleIndex) => ({
      grupo: item.grupo,
      cantidad: detalle.cantidad,
      alimento: detalle.alimento,
      descripcion: detalle.descripcion,
      equivalenteId: detalle.equivalenteId,
      orden: itemIndex * 100 + detalleIndex
    }))
  );
}

function construirTituloMenu(tiempo, contenido) {
  const fecha = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date());
  const destacados = contenido.slice(0, 3).map((item) => item.alimento).join(", ");
  return `${capitalizar(tiempo)} - ${destacados || "Menu"} - ${fecha}`;
}

function hidratarCantidades(grupo, equivalentes, resumenGuardado) {
  return resumenGuardado
    .filter((item) => item.grupo === grupo)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .reduce((accumulator, item) => {
      const equivalente = equivalentes.find((candidate) => candidate.id === item.equivalenteId);
      if (!equivalente) {
        return accumulator;
      }

      accumulator[equivalente.id] = redondearCantidad(item.cantidad ?? 0);
      return accumulator;
    }, {});
}

async function recargarResumenGuardado(mostrarEstado = true) {
  const usuario = document.getElementById("usuario").value;
  const tiempo = document.getElementById("tiempo").value;

  try {
    const [resumenGuardado, dieta, equivalentes] = await Promise.all([
      apiFetch(`/api/resumen/${usuario}/${tiempo}`),
      apiFetch(`/api/dieta/${usuario}/${tiempo}`),
      apiFetch("/api/equivalentes")
    ]);

    if (resumenGuardado?.contenido) {
      seleccionActual = construirSeleccion(dieta, equivalentes, resumenGuardado.contenido);
      renderCards();
      renderResumen();
    }

    renderResumenGuardado(resumenGuardado);

    if (mostrarEstado) {
      estado.textContent = resumenGuardado?.contenido?.length
        ? "Resumen guardado recargado desde la base de datos."
        : "No hay resumen guardado para esta comida.";
    }
  } catch (error) {
    if (mostrarEstado) {
      estado.textContent = "No se pudo actualizar el resumen guardado.";
    }
  }
}

async function recargarHistorial(mostrarEstado = true) {
  const usuario = document.getElementById("usuario").value;
  const tiempo = document.getElementById("tiempo").value;

  try {
    historialActual = await apiFetch(`/api/historial/${usuario}/${tiempo}`);
    renderHistorial(historialActual);

    if (mostrarEstado) {
      estado.textContent = historialActual.length
        ? "Historial recargado correctamente."
        : "No hay menus guardados para esta comida.";
    }
  } catch (error) {
    if (mostrarEstado) {
      estado.textContent = "No se pudo cargar el historial.";
    }
  }
}

function renderResumenGuardado(resumenGuardado) {
  if (!resumenGuardado?.contenido?.length) {
    savedSummary.classList.add("hidden");
    savedSummaryContent.innerHTML = "";
    savedSummaryDate.textContent = "";
    return;
  }

  savedSummary.classList.remove("hidden");
  savedSummaryDate.textContent = `Guardado: ${formatearFecha(resumenGuardado.actualizado_en)}`;
  savedSummaryContent.innerHTML = tablaContenido(resumenGuardado.contenido);
}

function renderHistorial(historial) {
  if (!historial?.length) {
    historySection.classList.add("hidden");
    historyContent.innerHTML = "";
    historyCount.textContent = "";
    return;
  }

  historySection.classList.remove("hidden");
  historyCount.textContent = `${historial.length} menu(s)`;
  historyContent.innerHTML = historial.map((menu) => `
    <article class="history-card">
      <div class="history-card-header">
        <div>
          <h3>${menu.titulo}</h3>
          <p>${formatearFecha(menu.creado_en)}</p>
        </div>
        <div class="history-actions">
          <button type="button" data-mode="use" data-history-id="${menu.id}">Usar</button>
          <button type="button" data-mode="edit" data-history-id="${menu.id}">Editar</button>
          <button type="button" data-mode="delete" data-history-id="${menu.id}">Eliminar</button>
        </div>
      </div>
      <div class="history-table">${tablaContenido(menu.contenido)}</div>
    </article>
  `).join("");

  historyContent.querySelectorAll("[data-mode='use']").forEach((button) => button.addEventListener("click", usarMenuHistorial));
  historyContent.querySelectorAll("[data-mode='edit']").forEach((button) => button.addEventListener("click", editarMenuHistorial));
  historyContent.querySelectorAll("[data-mode='delete']").forEach((button) => button.addEventListener("click", eliminarMenuHistorial));
}

function usarMenuHistorial(event) {
  const menu = buscarMenuHistorial(event.currentTarget.dataset.historyId);
  if (!menu) {
    estado.textContent = "No se encontro el menu seleccionado.";
    return;
  }

  aplicarMenu(menu);
  editingHistoryId = null;
  guardarResumenBtn.textContent = "Guardar";
  menuTitleInput.value = "";
  estado.textContent = "Menu del historial cargado en la seleccion actual.";
}

function editarMenuHistorial(event) {
  const menu = buscarMenuHistorial(event.currentTarget.dataset.historyId);
  if (!menu) {
    estado.textContent = "No se encontro el menu para editar.";
    return;
  }

  aplicarMenu(menu);
  editingHistoryId = menu.id;
  guardarResumenBtn.textContent = "Actualizar menu";
  menuTitleInput.value = menu.titulo;
  estado.textContent = "Editando menu guardado. Ajusta y guarda para actualizarlo.";
}

async function eliminarMenuHistorial(event) {
  const menu = buscarMenuHistorial(event.currentTarget.dataset.historyId);
  if (!menu) {
    estado.textContent = "No se encontro el menu para eliminar.";
    return;
  }

  try {
    await apiFetch(`/api/historial/${menu.id}`, { method: "DELETE" });

    if (editingHistoryId === menu.id) {
      editingHistoryId = null;
      guardarResumenBtn.textContent = "Guardar";
      menuTitleInput.value = "";
    }

    await recargarHistorial(false);
    estado.textContent = `Menu eliminado: ${menu.titulo}`;
  } catch (error) {
    estado.textContent = "No se pudo eliminar el menu.";
  }
}

function buscarMenuHistorial(id) {
  return historialActual.find((item) => item.id === Number(id));
}

function aplicarMenu(menu) {
  seleccionActual.forEach((grupo) => {
    grupo.cantidades = {};
    grupo.collapsed = false;
  });

  menu.contenido.forEach((item) => {
    const grupo = seleccionActual.find((candidate) => candidate.grupo === item.grupo);
    if (!grupo) {
      return;
    }

    grupo.cantidades[item.equivalenteId] = redondearCantidad(item.cantidad ?? 0);
    grupo.collapsed = true;
  });

  renderCards();
  renderResumen();
}

function tablaContenido(contenido) {
  return `
    <table>
      <thead>
        <tr>
          <th>Grupo</th>
          <th>Alimento</th>
          <th>Cantidad</th>
        </tr>
      </thead>
      <tbody>
        ${contenido.map((item) => `
          <tr>
            <td>${capitalizar(item.grupo)}</td>
            <td>${item.alimento}</td>
            <td>${calcularCantidadMostrada(item.cantidad, item.descripcion)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function pasoGrupo(porciones) {
  return porciones < 1 ? redondearCantidad(porciones) : 1;
}

function formatearPorciones(valor) {
  if (Number.isInteger(valor)) {
    return String(valor);
  }
  return valor.toFixed(1).replace(/\.0$/, "");
}

function redondearCantidad(valor) {
  return Math.round(valor * 10) / 10;
}

function calcularCantidadMostrada(cantidad, descripcion) {
  const parsed = interpretarDescripcion(descripcion);
  if (!parsed) {
    return `${formatearPorciones(cantidad)} x ${descripcion}`;
  }

  const total = redondearCantidad(parsed.valor * cantidad);
  const cantidadTexto = formatearCantidadNutricional(total);
  const unidad = ajustarUnidad(parsed.unidad, total);

  if (parsed.extra) {
    return `${cantidadTexto} ${unidad} (${parsed.extra} c/u)`;
  }

  return `${cantidadTexto} ${unidad}`.trim();
}

function interpretarDescripcion(descripcion) {
  const texto = descripcion.trim();
  const match = texto.match(/^(\d+(?:\/\d+)?|\d+\.\d+)\s+(.+?)(?:\s+\((.+)\))?$/i);
  if (!match) {
    return null;
  }

  const valor = convertirCantidadTexto(match[1]);
  if (valor === null) {
    return null;
  }

  return { valor, unidad: match[2].trim(), extra: match[3]?.trim() ?? "" };
}

function convertirCantidadTexto(texto) {
  if (texto.includes("/")) {
    const [numerador, denominador] = texto.split("/").map(Number);
    if (!numerador || !denominador) {
      return null;
    }
    return numerador / denominador;
  }

  const valor = Number(texto);
  return Number.isNaN(valor) ? null : valor;
}

function formatearCantidadNutricional(valor) {
  const fracciones = new Map([[0.25, "1/4"], [0.5, "1/2"], [0.75, "3/4"]]);
  const entero = Math.floor(valor);
  const decimal = redondearCantidad(valor - entero);

  if (fracciones.has(valor)) {
    return fracciones.get(valor);
  }
  if (fracciones.has(decimal) && entero > 0) {
    return `${entero} ${fracciones.get(decimal)}`;
  }
  if (Number.isInteger(valor)) {
    return String(valor);
  }
  return formatearPorciones(valor);
}

function ajustarUnidad(unidad, total) {
  const singularPlural = [
    ["pieza", "piezas"],
    ["taza", "tazas"],
    ["rebanada", "rebanadas"],
    ["cucharadita", "cucharaditas"],
    ["cucharada", "cucharadas"]
  ];

  if (Math.abs(total - 1) < 0.001) {
    return unidad;
  }

  let ajustada = unidad;
  singularPlural.forEach(([singular, plural]) => {
    ajustada = ajustada.replace(new RegExp(`\\b${singular}\\b`, "gi"), plural);
  });
  return ajustada;
}

function capitalizar(valor) {
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function coincideFiltro(opcion, filtro) {
  if (!filtro.trim()) {
    return true;
  }

  const texto = `${opcion.alimento} ${opcion.descripcion}`.toLowerCase();
  return texto.includes(filtro.trim().toLowerCase());
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function icono(grupo) {
  const icons = {
    carnes: "Carnes",
    cereales: "Cereales",
    verduras: "Verduras",
    frutas: "Frutas",
    grasas: "Grasas",
    azucares: "Azucares",
    leche: "Leche",
    leguminosas: "Leguminosas"
  };
  return icons[grupo] || "Grupo";
}

function formatearFecha(valor) {
  if (!valor) {
    return "";
  }

  const fecha = new Date(valor.replace(" ", "T"));
  if (Number.isNaN(fecha.getTime())) {
    return valor;
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(fecha);
}
