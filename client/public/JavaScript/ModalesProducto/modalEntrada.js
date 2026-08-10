// Mapeo de opciones (los valores son los que espera el backend)
const opcionesPorTipo = {
  Reventa: [
    { value: "COMPRA", label: "Compra" },
    { value: "ENTRADA", label: "Ajuste de inventario" },
    { value: "ENTRADA", label: "Otro" },
  ],
  Elaborado: [
    { value: "PRODUCCION", label: "Producción" },
    { value: "ENTRADA", label: "Ajuste de inventario" },
    { value: "ENTRADA", label: "Otro" },
  ],
};

function cargarTiposEntrada(producto) {
  const select = document.getElementById("tipoEntrada");
  const opciones = opcionesPorTipo[producto.tipo] || [];
  select.innerHTML = `
        <option value="" selected disabled>Seleccione una opción</option>
        ${opciones.map((op) => `<option value="${op.value}">${op.label}</option>`).join("")}
    `;
}

// Listener para cuando el usuario cambia el tipo de entrada
document
  .getElementById("tipoEntrada")
  .addEventListener("change", async function () {
    const label = document.getElementById("labelCantidadEntrada");
    const ayuda = document.getElementById("ayudaCantidadEntrada");
    if (this.value === "PRODUCCION") {
      label.textContent = "Unidades reales producidas";
      if (ayuda) ayuda.textContent = "Cargando información de receta...";
      try {
        const res = await fetch(
          `/api/recetas/producto/${productoSeleccionado.id_producto}`,
        );
        if (res.ok) {
          const receta = await res.json();
          if (receta && receta.cantidad_producida_base) {
            ayuda.textContent = `La receta base rinde: ${receta.cantidad_producida_base} unidades. Ingrese el total obtenido.`;
          } else {
            ayuda.textContent =
              "Ingrese la cantidad total de unidades resultantes de la tanda.";
          }
        } else {
          if (ayuda)
            ayuda.textContent =
              "Ingrese la cantidad total de unidades resultantes de la tanda.";
        }
      } catch (error) {
        console.error("Error al consultar la receta:", error);
        if (ayuda)
          ayuda.textContent =
            "Ingrese la cantidad total de unidades resultantes de la tanda.";
      }
    } else {
      label.textContent = "Cantidad ingresada";
      if (ayuda) ayuda.textContent = "";
    }
  });

function abrirModalEntrada(producto) {
  limpiarErroresModal();
  document.getElementById("cantidadEntrada").value = "";
  document.getElementById("observacionEntrada").value = "";
  const ayuda = document.getElementById("ayudaCantidadEntrada");
  if (ayuda) ayuda.textContent = "";

  productoSeleccionado = producto;

  document.getElementById("nombreProductoEntrada").textContent =
    producto.nombre;
  document.getElementById("stockActualEntrada").textContent =
    producto.stock_actual;
  document.getElementById("tipoProductoEntrada").textContent = producto.tipo;
  cargarTiposEntrada(producto);

  const modal = new bootstrap.Modal(document.getElementById("modalEntrada"));
  modal.show();
}

// Helper para limpiar todos los mensajes de error
function limpiarErroresModal() {
  document
    .querySelectorAll("#modalEntrada .error-msg")
    .forEach((el) => (el.textContent = ""));
  document
    .querySelectorAll("#modalEntrada .is-invalid")
    .forEach((el) => el.classList.remove("is-invalid"));
  const errorGen = document.getElementById("errorGeneral");
  if (errorGen) errorGen.textContent = "";
}

// Helper para mostrar error en un campo específico
function mostrarErrorCampo(idInput, idError, mensaje) {
  const input = document.getElementById(idInput);
  const errorEl = document.getElementById(idError);
  if (input) input.classList.add("is-invalid");
  if (errorEl) errorEl.textContent = mensaje;
}

async function registrarEntrada() {
  limpiarErroresModal();
  let esValido = true;
  if (!productoSeleccionado) {
    document.getElementById("errorGeneral").textContent =
      "Debe seleccionar un producto.";
    return;
  }

  // Período seleccionado del header
  const selectPeriodo = document.getElementById("periodoInventario");
  if (!selectPeriodo || !selectPeriodo.value) {
    document.getElementById("errorGeneral").textContent =
      "Debe seleccionar un período válido.";
    return;
  }
  const [anioStr, mesStr] = selectPeriodo.value.split("-");

  // Tipo de Entrada
  const tipoInput = document.getElementById("tipoEntrada");
  const tipo = tipoInput.value;
  if (!tipo) {
    mostrarErrorCampo(
      "tipoEntrada",
      "errorTipo",
      "Seleccione un tipo de entrada.",
    );
    esValido = false;
  }

  // Cantidad
  const cantidadInput = document.getElementById("cantidadEntrada");
  const cantidad = Number(cantidadInput.value);
  if (isNaN(cantidad) || cantidad <= 0) {
    mostrarErrorCampo(
      "cantidadEntrada",
      "errorCantidad",
      "Ingrese una cantidad válida mayor a 0.",
    );
    esValido = false;
  }

  if (!esValido) return;

  const costoUnitario = Number(productoSeleccionado.costo) || 0;
  const costoTotal = costoUnitario * cantidad;

  const observacion = document
    .getElementById("observacionEntrada")
    .value.trim();

  const movimiento = {
    id_producto: productoSeleccionado.id_producto,
    anio: Number(anioStr),
    mes: Number(mesStr),
    tipo_movimiento: tipo,
    cantidad: cantidad,
    costo_unitario: costoUnitario,
    costo_total: costoTotal,
    observacion: observacion,
  };

  try {
    const response = await fetch("/api/entrada", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(movimiento),
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        data.error || data.mensaje || "Error al registrar el movimiento.",
      );

    const nuevoStock =
      data.nuevo_stock_actual !== undefined
        ? data.nuevo_stock_actual
        : Number(productoSeleccionado.stock_actual) + cantidad;

    productoSeleccionado.stock_actual = nuevoStock;

    Swal.fire({
      icon: "success",
      title: "Entrada registrada correctamente",
      returnFocus: false
    });

    // Actualización instantánea en la tabla Tabulator
    if (typeof tabla !== "undefined" && tabla) {
      tabla.updateData([
        {
          id_producto: productoSeleccionado.id_producto,
          stock_actual: nuevoStock,
        },
      ]);
    }

    // Cerrar Modal
    const modalEl = document.getElementById("modalEntrada");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) modal.hide();
  } catch (error) {
    console.error("Error al registrar la entrada:", error);

    document.getElementById("errorGeneral").textContent = error.message;

    Swal.fire({
      icon: "error",
      text: "No se pudo registrar la entrada",
      returnFocus: false
    });
  }
}

// Limpiar errores automáticamente cuando el usuario cierra el modal
const modalEntrada = document.getElementById("modalEntrada");
if (modalEntrada) {
  modalEntrada.addEventListener("hidden.bs.modal", limpiarErroresModal);
}

document
  .getElementById("guardarEntrada")
  .addEventListener("click", registrarEntrada);