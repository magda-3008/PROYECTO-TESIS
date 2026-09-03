// Motivos de salida disponibles para registro manual
const motivosSalida = [{
	value: "PERDIDA",
	label: "Pérdida"
}, {
	value: "AJUSTE",
	label: "Ajuste de inventario"
}, {
	value: "OTRO",
	label: "Otro"
}];

function cargarMotivosSalida() {
	const select = document.getElementById("motivoSalida");
	if (!select) return;
	select.innerHTML = `
        <option value="" selected disabled>
            Seleccione un motivo
        </option>

        ${motivosSalida
			.map(
				(motivo) =>
					`<option value="${motivo.value}">
                        ${motivo.label}
                    </option>`
			)
			.join("")}
    `;
}

function abrirModalSalida(producto) {
	limpiarErroresModalSalida();
	productoSeleccionado = producto;
	document.getElementById("cantidadSalida").value = "";
	document.getElementById("observacionSalida").value = "";
	document.getElementById("nombreProductoSalida").textContent = producto.nombre;
	document.getElementById("stockActualSalida").textContent = producto.stock_actual;
	document.getElementById("tipoProductoSalida").textContent = producto.tipo;
	cargarMotivosSalida();
	const modal = new bootstrap.Modal(document.getElementById("modalSalida"));
	modal.show();
}
// ---------------- VALIDACIONES ----------------
function limpiarErroresModalSalida() {
	const modal = document.getElementById("modalSalida");
	if (!modal) return;
	modal.querySelectorAll(".error-msg").forEach(
		(el) => (el.textContent = ""));
	modal.querySelectorAll(".is-invalid").forEach(
		(el) => el.classList.remove("is-invalid"));
}

function mostrarErrorCampoSalida(idInput, idError, mensaje) {
	const input = document.getElementById(idInput);
	const errorEl = document.getElementById(idError);
	if (input) {
		input.classList.add("is-invalid");
	}
	if (errorEl) {
		errorEl.textContent = mensaje;
	}
}
// ---------------- REGISTRAR SALIDA ----------------
async function registrarSalida() {
	limpiarErroresModalSalida();
	let esValido = true;
	// ---------------- PRODUCTO ----------------
	if (!productoSeleccionado) {
		document.getElementById("errorGeneralSalida").textContent = "Debe seleccionar un producto.";
		return;
	}
	// ---------------- MOTIVO ----------------
	const motivoInput = document.getElementById("motivoSalida");
	const motivo = motivoInput.value;
	if (!motivo) {
		mostrarErrorCampoSalida("motivoSalida", "errorMotivoSalida", "Seleccione un motivo de salida.");
		esValido = false;
	}
	// ---------------- CANTIDAD ----------------
	const cantidadInput = document.getElementById("cantidadSalida");
	const cantidad = Number(cantidadInput.value);
	if (isNaN(cantidad) || cantidad <= 0) {
		mostrarErrorCampoSalida("cantidadSalida", "errorCantidadSalida", "Ingrese una cantidad válida mayor a 0.");
		esValido = false;
	} else if (cantidad > Number(productoSeleccionado.stock_actual)) {
		mostrarErrorCampoSalida("cantidadSalida", "errorCantidadSalida", "La cantidad no puede superar el stock actual.");
		esValido = false;
	}
	if (!esValido) {
		return;
	}
	// ---------------- OBSERVACIÓN ----------------
	const observacion = document.getElementById("observacionSalida").value.trim();
	// ---------------- DATOS DEL MOVIMIENTO ----------------
	const movimiento = {
		id_producto: productoSeleccionado.id_producto,
		tipo_movimiento: "SALIDA",
		motivo: motivo,
		cantidad: cantidad,
		observacion: observacion || null
	};
	// ---------------- ENVIAR AL SERVIDOR ----------------
	try {
		const response = await fetch("/api/salida", {
			method: "POST",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(movimiento)
		});
		const data = await response.json();
		if (!response.ok) {
			throw new Error(data.error || data.mensaje || "Error al registrar la salida.");
		}
		// ---------------- NUEVO STOCK ----------------
		const nuevoStock = data.nuevo_stock_actual !== undefined ? data.nuevo_stock_actual : Number(productoSeleccionado.stock_actual) - cantidad;
		productoSeleccionado.stock_actual = nuevoStock;
		// ---------------- MENSAJE ----------------
		Swal.fire({
			icon: "success",
			title: "Salida registrada correctamente",
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
		const modalEl = document.getElementById("modalSalida");
		const modal = bootstrap.Modal.getInstance(modalEl);
		if (modal) {
			modal.hide();
		}
	} catch (error) {
		console.error("Error al registrar la salida:", error);
		document.getElementById("errorGeneralSalida").textContent = error.message;
		Swal.fire({
			icon: "error",
			text: "No se pudo registrar la salida",
			returnFocus: false
		});
	}
}
// ---------------- EVENTOS ----------------
const modalSalidaEl = document.getElementById("modalSalida");
if (modalSalidaEl) {
	modalSalidaEl.addEventListener("hidden.bs.modal", limpiarErroresModalSalida);
}
const botonGuardarSalida = document.getElementById("guardarSalida");
if (botonGuardarSalida) {
	botonGuardarSalida.addEventListener("click", registrarSalida);
}
