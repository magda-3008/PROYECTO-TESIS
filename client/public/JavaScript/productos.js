let tabla = null;
let productoSeleccionado = null;
let usuarioActual = null;

const productosInventario = {
  endpoint: "/api/productos",
  rowFormatter: function (row) {

    const data = row.getData();

    const elemento = row.getElement();

    elemento.classList.remove(
      "stock-normal",
      "stock-bajo",
      "stock-agotado",
      "stock-no-controlado",
    );

    if (data.stock_actual === null) {
      elemento.classList.add("stock-no-controlado");
      return;
    }

    const stockActual = Number(data.stock_actual);
    const stockMinimo = Number(data.stock_minimo_p);

    if (stockActual <= 0) {
      elemento.classList.add("stock-agotado");

    } else if (stockActual <= stockMinimo) {
      elemento.classList.add("stock-bajo");

    } else {
      elemento.classList.add("stock-normal");
    }
  },
  columns: [
    { title: "Nombre del producto", field: "nombre", frozen: true, width: 160, cssClass: "columna-texto-ajustable", headerWordWrap: true, headerTooltip: true },
    { title: "Tipo", field: "tipo", hozAlign: "center", minWidth: 80 },
    { title: "Precio de venta", field: "precio_venta", formatter: formatoMoneda, hozAlign: "center", minWidth: 100, headerWordWrap: true, headerTooltip: true },
    { title: "Costo de compra/producción", field: "costo", formatter: formatoMoneda, hozAlign: "center", minWidth: 100, headerWordWrap: true, headerTooltip: true },
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
      cellClick: async function (e, cell) {
        // El Colaborador solamente puede consultar el estado.
        if (usuarioActual?.rol !== "Administrador") {
          return;
        }
        e.preventDefault();
        e.stopPropagation();

        const estadoActual = cell.getValue();
        const nuevoEstado = estadoActual === "Activo" ? "Inactivo" : "Activo";
        const producto = cell.getRow().getData();

        try {
          const respuesta = await fetch(
            `/api/productos/${producto.id_producto}`,
            {
              method: "PATCH",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                estado: nuevoEstado,
              }),
            },
          );
          if (!respuesta.ok) {
            await manejarErrorRespuesta(
              respuesta,
              "No se pudo actualizar el estado del producto.",
            );
            return;
          }
          const datos = await respuesta.json();

          // Actualizar el estado visual de la tabla
          cell.setValue(nuevoEstado);

          // Avisar al resto de la aplicación que cambió el estado de un producto
          document.dispatchEvent(
            new CustomEvent("estadoProductoActualizado", {
              detail: {
                id_producto: producto.id_producto,
                estado: nuevoEstado,
              },
            }),
          );
        } catch (error) {
          console.error("Error al actualizar el estado del producto:", error);
          Swal.fire({
            icon: "error",
            title: "No se pudo actualizar",
            text: error.message,
          });
        }
      },
    },
    {
      title: "Existencia actual", field: "stock_actual", hozAlign: "center", minWidth: 80, headerWordWrap: true, headerTooltip: true,
      formatter: function (cell) {
        const valor = cell.getValue();

        if (valor === null) {
          return "—";
        }

        const stock = Number(valor);

        return Number.isNaN(stock) ? 0 : Math.floor(stock);
      },
    },
    {
      title: "Acciones",
      hozAlign: "center",
      headerSort: false,
      minWidth: 120,
      formatter: function () {
        let acciones = `
                    <button class="btnAccion btnEntrada" title="Registrar entrada"> <i class="fa-sharp fa-solid fa-cart-plus"></i> </button>

                    <button class="btnAccion btnSalida" title="Registrar salida"> <i class="fa-sharp fa-solid fa-cart-minus"></i> </button>

                    <button class="btnAccion btnHistorial" title="Ver historial"> <i class="bi bi-clock-history"></i> </button>

                `;

        // Solo el Administrador puede editar productos.
        if (usuarioActual?.rol === "Administrador") {
          acciones += `
                    <button class="btnAccion btnEditar" title="Editar producto"> <i class="bi bi-pencil"></i> </button>
                    `;
        }
        return `
                    <div class="acciones-tabla">
                        ${acciones}
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
          return;
        }

        if (e.target.closest(".btnEditar")) {

          // Segunda protección a nivel de interfaz.
          if (usuarioActual?.rol !== "Administrador") {
            return;
          }
          abrirModalEditarProducto(producto, cell.getRow());
        }
      },
    },
  ],
};

async function cargarVista() {
  usuarioActual = await verificarSesionYRedirigir();

  if (!usuarioActual) {
    return;
  }

  const endpoint = productosInventario.endpoint;

  // Elimina la tabla anterior si existe
  if (tabla) {
    tabla.destroy();
    tabla = null;
  }

  crearFiltros();

  document.getElementById("tablaProductos").innerHTML = `
        <div class="tabla-cargando">
            <div class="spinner-border text-info" role="status"></div>
            <p>Cargando información...</p>
        </div>
    `;

  let datos = [];

  try {
    const respuesta = await fetch(endpoint, {
      credentials: "include",
    });
    if (!respuesta.ok) {
      if (respuesta.status === 401 || respuesta.status === 403) {
        await manejarErrorRespuesta(
          respuesta,
          "No se pudo acceder al inventario.",
        );
        return;
      }
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
    rowFormatter: productosInventario.rowFormatter,
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
  inicializarEventosFiltros();
}

function crearFiltros() {
  const panel = document.getElementById("panelFiltros");

  panel.innerHTML = `
        <h3 style="color: #4a7f83; font-size: 20px; font-weight: 700;">FILTRAR POR</h3>
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
                    <option value="no-controla">No controla stock</option>
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
  if (!tabla) {
    return;
  }
  const texto = document.getElementById("buscar").value.toLowerCase();
  tabla.setFilter(function (data) {
    let coincide = true;

    if (texto) {
      coincide = Object.values(data).some((valor) =>
        String(valor).toLowerCase().includes(texto),
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
          coincide =
            data.stock_actual !== null && Number(data.stock_actual) <= 0;
          break;
        case "bajo":
          coincide =
            data.stock_actual !== null &&
            Number(data.stock_actual) > 0 &&
            Number(data.stock_actual) <= Number(data.stock_minimo_p);
          break;
        case "normal":
          coincide =
            data.stock_actual !== null &&
            Number(data.stock_actual) > Number(data.stock_minimo_p);
          break;
        case "no-controla":
          coincide = data.stock_actual === null;
          break;
      }
    }
    return coincide;
  });
}

const buscador = document.getElementById("buscar");
buscador.addEventListener("input", aplicarFiltros);

document.addEventListener("DOMContentLoaded", () => {
  cargarVista();
});
