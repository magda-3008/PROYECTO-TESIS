let tabla = null;
let productoSeleccionado = null;

// Configuración de vista (solo inventario)
const productosInventario = {
  endpoint: "/api/productos",
  columns: [
    { title: "Nombre del producto", field: "nombre", frozen: true, width: 160, cssClass: "columna-texto-ajustable", headerWordWrap: true, headerToolTip: true, editor: "input" },
    { title: "Tipo", field: "tipo", hozAlign: "center", minWidth: 80 },
    {
      title: "Precio de venta", field: "precio_venta", formatter: formatoMoneda, hozAlign: "center", minWidth: 100, headerWordWrap: true, headerTooltip: true, editor: "number",
      editorParams: { min: 0, step: 0.01 }
    },
    { title: "Costo de compra/producción", field: "costo", formatter: formatoMoneda, hozAlign: "center", minWidth: 100, headerWordWrap: true, headerTooltip: true },
    {
      title: "Margen de ganancia bruta esperado (%)", field: "margen_gananciab_esperado", variableHeight: true, formatter: formatoPorcentaje, hozAlign: "center",
      minWidth: 100, headerWordWrap: true, headerTooltip: true, editor: "number", editorParams: { min: 0, step: 0.01 }
    },
    {
      title: "Estado",
      field: "estado",
      hozAlign: "center",
      minWidth: 80,
      formatter: function (cell) {
        const valor = cell.getValue();

        if (valor === "Activo") {
          return `<span class="text-success fw-semibold">Activo</span>`;
        }

        if (valor === "Inactivo") {
          return `<span class="text-danger fw-semibold">Inactivo</span>`;
        }
        return valor;
      },

      cellClick: function (e, cell) {
        e.preventDefault();
        e.stopPropagation();

        const estadoActual = cell.getValue();

        const nuevoEstado =
          estadoActual === "Activo"
            ? "Inactivo"
            : "Activo";

        cell.setValue(nuevoEstado);
      }
    },
    {
      title: "Existencia actual", field: "stock_actual", hozAlign: "center", minWidth: 80, headerWordWrap: true, headerTooltip: true,
      formatter: function (cell) {
        const data = cell.getRow().getData();
        if (
          data.nombre === "Chocobanano preparado" ||
          data.nombre === "Frappé"
        ) {
          return "—";
        }
        const stock = Number(cell.getValue());
        return isNaN(stock) ? 0 : Math.floor(stock);
      },
    },
    {
      title: "Acciones",
      hozAlign: "center",
      headerSort: false,
      minWidth: 120,
      formatter: function () {
        return `
                    <div class="acciones-tabla">
                        <button class="btnAccion btnEntrada" title="Registrar entrada">
                            <i class="bi bi-cart-plus"></i>
                        </button>
                        <button class="btnAccion btnSalida" title="Registrar salida">
                            <i class="bi bi-cart-dash"></i>
                        </button>

                        <button class="btnAccion btnHistorial" title="Ver historial">
                            <i class="bi bi-clock-history"></i>
                        </button>
                    </div>
                `;
      },

      cellClick: function (e, cell) {
        const producto = cell.getRow().getData();

        if (e.target.closest(".btnSalida")) {
          abrirModalSalida(producto);
          return;
        }

        if (e.target.closest(".btnEntrada")) {
          abrirModalEntrada(producto);
          return;
        }

        if (e.target.closest(".btnHistorial")) {
          abrirHistorial(producto);
        }
      },
    },
  ],
};

// Cargar vista de Inventario
async function cargarVista() {
  const endpoint = productosInventario.endpoint;

  // Elimina la tabla anterior si existe
  if (tabla) {
    tabla.destroy();
    tabla = null;
  }

  crearFiltros();

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
                <button class="btn btn-primary mt-3"
                    onclick="cargarVista()">
                    Reintentar
                </button>
            </div>
        `;

    return;
  }

  tabla = new Tabulator("#tablaProductos", {
    data: datos,
    tooltipGenerationMode: "hover",
    tooltips: true,
    index: "id_producto",
    layout: "fitColumns",
    columnHeaderVertAlign: "middle",
    pagination: true,
    paginationSize: 30,
    rowHeader: {
      formatter: "rownum",
      width: 40,
      hozAlign: "center",
      headerSort: false,
      frozen: true,
    },
    columns: productosInventario.columns,
    placeholder: "No se encontraron resultados",
  });

  // ESCUCHA DE CAMBIOS EN CELDAS
  tabla.on("cellEdited", async function (cell) {
    const valorNuevo = cell.getValue();
    const valorAnterior = cell.getOldValue();

    if (valorNuevo === valorAnterior) return;

    const filaData = cell.getRow().getData();
    const idProducto = filaData.id_producto;
    const campoEditado = cell.getField();

    try {
      const respuesta = await fetch(`/api/productos/${idProducto}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          [campoEditado]: valorNuevo
        }),
      });

      if (!respuesta.ok) {
        throw new Error("Error al guardar el cambio.");
      }

      cell.getElement().classList.add("celda-actualizada");

      setTimeout(() => {
        cell.getElement().classList.remove("celda-actualizada");
      }, 7000);

      if (campoEditado !== "estado") {
        Swal.fire({
          icon: "success",
          title: "Cambio guardado correctamente",
          returnFocus: false
        });
      }

    } catch (error) {
      console.error(
        "Error al actualizar la base de datos:",
        error
      );

      cell.setValue(valorAnterior, false);

      cell.getElement().classList.add("celda-error");

      setTimeout(() => {
        cell.getElement().classList.remove("celda-error");
      }, 7000);

      Swal.fire({
        icon: "error",
        title: "No se pudo guardar la modificación",
        returnFocus: false
      });
    }
  });

  inicializarEventosFiltros();
}

// Crear filtros de inventario
function crearFiltros() {
  const panel = document.getElementById("panelFiltros");

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
}

function inicializarEventosFiltros() {
  document
    .getElementById("filtroEstado")
    .addEventListener("change", aplicarFiltros);

  document
    .getElementById("filtroStock")
    .addEventListener("change", aplicarFiltros);
}

function aplicarFiltros() {
  const texto = document.getElementById("buscar").value.toLowerCase();

  tabla.setFilter(function (data) {
    let coincide = true;

    // Buscador general
    if (texto) {
      coincide = Object.values(data).some((valor) =>
        String(valor).toLowerCase().includes(texto)
      );
    }

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

    return coincide;
  });
}

const buscador = document.getElementById("buscar");
buscador.addEventListener("input", aplicarFiltros);

// Inicio
document.addEventListener("DOMContentLoaded", () => {
  cargarVista();
});