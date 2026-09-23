// Mapeo de motivos según el tipo de producto
const opcionesPorTipo = {
  Reventa: [{
    value: "COMPRA",
    label: "Compra"
  }, {
    value: "AJUSTE",
    label: "Ajuste de inventario"
  }, {
    value: "OTRO",
    label: "Otro"
  },],
  Elaborado: [{
    value: "PRODUCCION",
    label: "Producción"
  }, {
    value: "AJUSTE",
    label: "Ajuste de inventario"
  }, {
    value: "OTRO",
    label: "Otro"
  },],
};

function cargarMotivosEntrada(producto) {
  const select = document.getElementById("tipoEntrada");
  const opciones = opcionesPorTipo[producto.tipo] || [];
  select.innerHTML = `
        <option value="" selected disabled>
            Seleccione un motivo
        </option>

        ${opciones
      .map(
        (op) =>
          `<option value="${op.value}">
                        ${op.label}
                    </option>`
      )
      .join("")}
    `;
}
// Listener para cuando cambia el motivo de entrada
document.getElementById("tipoEntrada").addEventListener("change", async function () {
  const label = document.getElementById("labelCantidadEntrada");
  const ayuda = document.getElementById("ayudaCantidadEntrada");
  if (this.value === "PRODUCCION") {
    label.textContent = "Unidades reales producidas";
    if (ayuda) {
      ayuda.textContent = "Cargando información de receta...";
    }
    try {
      const res = await fetch(`/api/recetas/producto/${productoSeleccionado.id_producto}`);
      if (res.ok) {
        const receta = await res.json();
        if (receta && receta.cantidad_producida_base) {
          ayuda.textContent = `La receta base rinde: ${receta.cantidad_producida_base} unidades. Ingrese el total obtenido.`;
        } else {
          ayuda.textContent = "Ingrese la cantidad total de unidades resultantes de la tanda.";
        }
      } else {
        ayuda.textContent = "Ingrese la cantidad total de unidades resultantes de la tanda.";
      }
    } catch (error) {
      console.error("Error al consultar la receta:", error);
      if (ayuda) {
        ayuda.textContent = "Ingrese la cantidad total de unidades resultantes de la tanda.";
      }
    }
  } else {
    label.textContent = "Cantidad ingresada";
    if (ayuda) {
      ayuda.textContent = "";
    }
  }
});

function abrirModalEntrada(producto) {
  limpiarErroresModal();
  document.getElementById("cantidadEntrada").value = "";
  document.getElementById("observacionEntrada").value = "";
  const ayuda = document.getElementById("ayudaCantidadEntrada");
  if (ayuda) {
    ayuda.textContent = "";
  }
  productoSeleccionado = producto;
  document.getElementById("nombreProductoEntrada").textContent = producto.nombre;
  document.getElementById("stockActualEntrada").textContent = producto.stock_actual;
  document.getElementById("tipoProductoEntrada").textContent = producto.tipo;
  cargarMotivosEntrada(producto);
  const modal = new bootstrap.Modal(document.getElementById("modalEntrada"));
  modal.show();
}
// Limpiar mensajes de error
function limpiarErroresModal() {
  document.querySelectorAll("#modalEntrada .error-msg").forEach(
    (el) => (el.textContent = ""));
  document.querySelectorAll("#modalEntrada .is-invalid").forEach(
    (el) => el.classList.remove("is-invalid"));
  const errorGen = document.getElementById("errorGeneral");
  if (errorGen) {
    errorGen.textContent = "";
  }
}
// Mostrar error en un campo específico
function mostrarErrorCampo(idInput, idError, mensaje) {
  const input = document.getElementById(idInput);
  const errorEl = document.getElementById(idError);
  if (input) {
    input.classList.add("is-invalid");
  }
  if (errorEl) {
    errorEl.textContent = mensaje;
  }
}
async function registrarEntrada() {
  limpiarErroresModal();
  let esValido = true;
  if (!productoSeleccionado) {
    document.getElementById("errorGeneral").textContent = "Debe seleccionar un producto.";
    return;
  }
  // ---------------- MOTIVO ----------------
  const motivoInput = document.getElementById("tipoEntrada");
  const motivo = motivoInput.value;
  if (!motivo) {
    mostrarErrorCampo("tipoEntrada", "errorTipo", "Seleccione un motivo de entrada.");
    esValido = false;
  }
  // ---------------- CANTIDAD ----------------
  const cantidadInput = document.getElementById("cantidadEntrada");
  const cantidad = Number(cantidadInput.value);
  if (isNaN(cantidad) || cantidad <= 0) {
    mostrarErrorCampo("cantidadEntrada", "errorCantidad", "Ingrese una cantidad válida mayor a 0.");
    esValido = false;
  }
  if (!esValido) {
    return;
  }
  // ---------------- OBSERVACIÓN ----------------
  const observacion = document.getElementById("observacionEntrada").value.trim();
  // ---------------- MOVIMIENTO ----------------
  const movimiento = {
    id_producto: productoSeleccionado.id_producto,
    tipo_movimiento: "ENTRADA",
    motivo: motivo,
    cantidad: cantidad,
    observacion: observacion || null
  };
  // ---------------- ENVIAR AL SERVIDOR ----------------
  try {
    const response = await fetch("/api/entrada", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(movimiento)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.mensaje || "Error al registrar la entrada.");
    }
    // ---------------- ACTUALIZAR STOCK ----------------
    const nuevoStock = data.nuevo_stock_actual !== undefined ? data.nuevo_stock_actual : Number(productoSeleccionado.stock_actual) + cantidad;
    productoSeleccionado.stock_actual = nuevoStock;
    // ---------------- MENSAJE DE ÉXITO ----------------
    Swal.fire({
      icon: "success",
      title: "Entrada registrada correctamente",
      returnFocus: false
    });
    // ---------------- ACTUALIZAR TABLA ----------------
    if (typeof tabla !== "undefined" && tabla) {
      tabla.updateData([{
        id_producto: productoSeleccionado.id_producto,
        stock_actual: nuevoStock
      }]);
    }
    // ---------------- CERRAR MODAL ----------------
    const modalEl = document.getElementById("modalEntrada");
    const modal = bootstrap.Modal.getInstance(modalEl);
    if (modal) {
      modal.hide();
    }
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
// Limpiar errores al cerrar el modal
const modalEntrada = document.getElementById("modalEntrada");
if (modalEntrada) {
  modalEntrada.addEventListener("hidden.bs.modal", limpiarErroresModal);
}
// Botón guardar
document.getElementById("guardarEntrada").addEventListener("click", registrarEntrada);
