let tabla = null;
let productoSeleccionado = null;

//configuración de vistas
const vistas = {
  inventario: {
    endpoint: "/api/productos",
    columns: [
      // Prioridad 0: SIEMPRE visible
      {
        title: "Nombre del producto",
        field: "nombre",
        responsive: 0,
        minWidth: 150,
      },

      // Prioridad 1 y 2: Visibles en tablets/móviles medianos
      {
        title: "Existencia actual",
        field: "stock_actual",
        responsive: 1,
        hozAlign: "center",
        formatter: function (cell) {
          const data = cell.getRow().getData();
          if (
            data.nombre === "Chocobanano preparado" ||
            data.nombre === "Frappé"
          ) {
            return "—";
          }
          return data.stock_actual;
        },
      },
      {
        title: "Precio de venta",
        field: "precio_venta",
        responsive: 2,
        formatter: formatoMoneda,
        hozAlign: "center",
      },

      // Prioridad alta (3+): Se ocultan primero en pantallas pequeñas y pasan al sub-menú (+)
      { title: "Tipo", field: "tipo", responsive: 3, hozAlign: "center" },
      {
        title: "Costo",
        field: "costo",
        responsive: 4,
        formatter: formatoMoneda,
        hozAlign: "center",
      },
      {
        title: "Margen (%)",
        field: "margen_gananciab_esperado",
        responsive: 5,
        formatter: formatoPorcentaje,
        hozAlign: "center",
      },
      { title: "Estado", field: "estado", responsive: 3, hozAlign: "center" },
      {
        title: "Existencia inicial",
        field: "stock_inicial",
        responsive: 6,
        hozAlign: "center",
      },

      // Acciones siempre visibles al final
      {
        title: "Acciones",
        hozAlign: "center",
        headerSort: false,
        responsive: 0,
        formatter: function () {
          return `
                        <div class="acciones-tabla">
                            <button class="btnAccion btnPerdida" title="Registrar pérdida"><i class="bi bi-cart-dash"></i></button>
                            <button class="btnAccion btnEntrada" title="Registrar entrada"><i class="bi bi-cart-plus"></i></button>
                            <button class="btnAccion btnHistorial" title="Ver historial"><i class="bi bi-clock-history"></i></button>
                        </div>
                    `;
        },
        cellClick: function (e, cell) {
          const producto = cell.getRow().getData();
          if (e.target.closest(".btnPerdida")) abrirModalPerdida(producto);
          if (e.target.closest(".btnEntrada")) abrirModalEntrada(producto);
          if (e.target.closest(".btnHistorial")) abrirHistorial(producto);
        },
      },
    ],
  },
  analisis: {
    endpoint: "/api/productos/analisis",
    columns: [
      {
        title: "Nombre del producto",
        field: "nombre_producto",
        responsive: 0,
        minWidth: 150,
      },
      {
        title: "Ganancia real",
        field: "ganancia_real_cordobas",
        responsive: 1,
        formatter: formatoMoneda,
        hozAlign: "center",
      },
      {
        title: "Precio actual",
        field: "precio_venta_actual",
        responsive: 2,
        formatter: formatoMoneda,
        hozAlign: "center",
      },
      {
        title: "Precio sugerido",
        field: "precio_venta_sugerido",
        responsive: 3,
        formatter: formatoMoneda,
        hozAlign: "center",
      },
      {
        title: "Costo prod.",
        field: "costo_unitario_prod",
        responsive: 4,
        formatter: formatoMoneda,
        hozAlign: "center",
      },
      {
        title: "Margen (C$)",
        field: "margen_esperado_cordobas",
        responsive: 5,
        formatter: formatoMoneda,
        hozAlign: "center",
      },
    ],
  },
};

//cargar vista
async function cargarVista(vista) {
  const configuracion = vistas[vista];
  const periodo = document.getElementById("periodoInventario").value;
  const [anio, mes] = periodo.split("-");

  let endpoint = configuracion.endpoint;

  if (vista === "inventario") {
    endpoint += `?anio=${anio}&mes=${mes}`;
  }

  // Elimina la tabla anterior
  if (tabla) {
    tabla.destroy();
    tabla = null;
  }

  crearFiltros(vista);

  // Mostrar indicador de carga
  document.getElementById("tablaProductos").innerHTML = `
        <div class="tabla-cargando">
            <div class="spinner-border text-info" role="status"></div>
            <p>Cargando información...</p>
        </div>
    `;

  let datos = [];

  try {
    const respuesta = await fetch(endpoint);

    if (!respuesta.ok) {
      throw new Error("No se pudieron obtener los datos.");
    }

    datos = await respuesta.json();
  } catch (error) {
    console.error(error);

    document.getElementById("tablaProductos").innerHTML = `
            <div class="tabla-error">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <h4>Error al cargar la información</h4>
                <p>Verifica tu conexión o inténtalo nuevamente.</p>
                <button class="btn btn-primary mt-3" onclick="cargarVista('${vista}')">
                    Reintentar
                </button>
            </div>
        `;
    return;
  }

  tabla = new Tabulator("#tablaProductos", {
    data: datos,
    layout: "fitColumns", // Ajusta el ancho automáticamente
    responsiveLayout: "collapse", // Colapsa columnas sobrantes en un sub-registro
    responsiveLayoutCollapseStartOpen: false, // Inicia colapsado
    responsiveLayoutCollapseFormatter: function (data) {
      let list = document.createElement("ul");
      list.classList.add("list-group", "list-group-flush", "p-2");

      let count = 0;

      for (let key in data) {
        // Opcional: ignorar valores vacíos o nulos
        if (data[key] !== undefined && data[key] !== null) {
          let item = document.createElement("li");
          item.classList.add(
            "list-group-item",
            "d-flex",
            "justify-content-between",
            "align-items-center",
            "bg-transparent",
          );
          item.innerHTML = `<strong>${key}:</strong> <span>${data[key]}</span>`;
          list.appendChild(item);
          count++;
        }
      }

      // Si no hay datos colapsados, retornamos un div contenedor con texto (Nodo DOM)
      if (count === 0) {
        let emptyMsg = document.createElement("div");
        emptyMsg.className = "p-2 text-muted text-center";
        emptyMsg.textContent = "Sin detalles adicionales";
        return emptyMsg;
      }

      return list; // Siempre retorna un Node DOM válido
    },
    columnHeaderVertAlign: "middle",
    pagination: true,
    paginationSize: 30,
    reactiveData: true,
    rowHeader: {
      formatter: "responsiveCollapse", // Agrega botón (+) para desplegar
      width: 30,
      minWidth: 30,
      hozAlign: "center",
      resizable: false,
      headerSort: false,
    },
    columns: configuracion.columns,
    placeholder: "No se encontraron resultados",
  });

  inicializarEventosFiltros(vista);
}

//Cargar periodos
async function cargarPeriodos() {
  const select = document.getElementById("periodoInventario");
  try {
    const respuesta = await fetch("/api/productos/periodos");
    if (!respuesta.ok) {
      throw new Error("No se pudieron obtener los períodos.");
    }
    const periodos = await respuesta.json();
    select.innerHTML = "";
    const meses = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    periodos.forEach((p, index) => {
      const option = document.createElement("option");
      option.value = `${p.anio}-${p.mes}`;
      option.textContent = `${meses[p.mes]} ${p.anio}`;

      if (index === 0) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  } catch (error) {
    console.error(error);
  }
}

//crear filtros
function crearFiltros(vista) {
  const panel = document.getElementById("panelFiltros");

  switch (vista) {
    case "inventario":
      panel.innerHTML = `
            <h3>Filtrar por:</h3>
                <div class="row g-2">
                    <div class="col-md-3">
                        <select id="filtroEstado" class="form-select">
                            <option value="">Todos los estados</option>
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                    </div>

                    <div class="col-md-3">
                        <select id="filtroStock" class="form-select">
                            <option value="">Todas las existencias</option>
                            <option value="0">Sin stock</option>
                            <option value="bajo">Stock bajo</option>
                            <option value="normal">Con stock</option>
                        </select>
                    </div>
                </div>
            `;
      break;

    case "analisis":
      panel.innerHTML = `
            <h3>Filtrar por:</h3>
                <div class="row g-2">
                    <div class="col-md-3">
                        <input id="gananciaMin" type="number" class="form-control" placeholder="Ganancia mínima">
                    </div>

                    <div class="col-md-3">
                        <input id="gananciaMax" type="number" class="form-control" placeholder="Ganancia máxima">
                    </div>

                    <div class="col-md-3">
                        <select id="filtroPrecio" class="form-select">
                            <option value="">Todos los precios</option>
                            <option value="mayor">Precio sugerido mayor</option>
                            <option value="menor">Precio sugerido menor</option>
                        </select>
                    </div>
                </div>
            `;
      break;
  }
}

function inicializarEventosFiltros(vista) {
  if (vista === "inventario") {
    document
      .getElementById("filtroEstado")
      .addEventListener("change", aplicarFiltros);

    document
      .getElementById("filtroStock")
      .addEventListener("change", aplicarFiltros);
  }

  if (vista === "analisis") {
    document
      .getElementById("gananciaMin")
      .addEventListener("input", aplicarFiltros);

    document
      .getElementById("gananciaMax")
      .addEventListener("input", aplicarFiltros);

    document
      .getElementById("filtroPrecio")
      .addEventListener("change", aplicarFiltros);
  }
}

function aplicarFiltros() {
  const texto = document.getElementById("buscar").value.toLowerCase();

  const vistaActual = document.querySelector("#tabsProductos .active").dataset
    .vista;

  tabla.setFilter(function (data) {
    let coincide = true;

    // Buscador
    if (texto) {
      coincide = Object.values(data).some((valor) =>
        String(valor).toLowerCase().includes(texto),
      );
    }

    if (vistaActual === "inventario") {
      const estado = document.getElementById("filtroEstado")?.value ?? "";
      const stock = document.getElementById("filtroStock")?.value ?? "";

      if (coincide && estado) {
        coincide = data.estado === estado;
      }

      if (coincide) {
        switch (stock) {
          case "0":
            coincide = Number(data.stock_actual) === 0;
            break;

          case "bajo":
            coincide = Number(data.stock_actual) <= 5;
            break;

          case "normal":
            coincide = Number(data.stock_actual) > 5;
            break;
        }
      }
    } else if (vistaActual === "analisis") {
      const min = Number(document.getElementById("gananciaMin")?.value || 0);
      const max = Number(
        document.getElementById("gananciaMax")?.value || Infinity,
      );
      const precio = document.getElementById("filtroPrecio")?.value ?? "";

      if (coincide) {
        coincide =
          Number(data.ganancia_real_cordobas) >= min &&
          Number(data.ganancia_real_cordobas) <= max;
      }

      if (coincide && precio === "mayor") {
        coincide =
          Number(data.precio_venta_sugerido) > Number(data.precio_venta_actual);
      }

      if (coincide && precio === "menor") {
        coincide =
          Number(data.precio_venta_sugerido) < Number(data.precio_venta_actual);
      }
    }
    return coincide;
  });
}

//cambio de pestañas
document.querySelectorAll("#tabsProductos .nav-link").forEach((tab) => {
  tab.addEventListener("click", () => {
    document.querySelector("#tabsProductos .active").classList.remove("active");

    tab.classList.add("active");

    cargarVista(tab.dataset.vista);
  });
});

const buscador = document.getElementById("buscar");

buscador.addEventListener("input", aplicarFiltros);

//inicio
document.addEventListener("DOMContentLoaded", async () => {
  await cargarPeriodos();

  cargarVista("inventario");
});

document.getElementById("periodoInventario").addEventListener("change", () => {
  const vistaActual = document.querySelector("#tabsProductos .active").dataset
    .vista;

  cargarVista(vistaActual);
});

function construirSelectorColumnas() {
  const menu = document.getElementById("menuColumnas");
  if (!menu || !tabla) return;

  menu.innerHTML = "";

  tabla.getColumns().forEach((col) => {
    const def = col.getDefinition();
    // Ignorar la columna de colapso (+) y la de acciones si se prefiere
    if (!def.title || def.title === "Acciones") return;

    const li = document.createElement("li");
    li.className = "dropdown-item-text";
    li.innerHTML = `
            <div class="form-check">
                <input class="form-check-input chk-columna" type="checkbox" id="col_${def.field}" value="${def.field}" ${col.isVisible() ? "checked" : ""}>
                <label class="form-check-label" for="col_${def.field}">
                    ${def.title}
                </label>
            </div>
        `;

    li.querySelector("input").addEventListener("change", (e) => {
      tabla.toggleColumn(e.target.value);
    });

    menu.appendChild(li);
  });
}
