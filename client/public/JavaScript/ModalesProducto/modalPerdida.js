function abrirModalPerdida(producto) {
	limpiarErroresModalPerdida();
	productoSeleccionado = producto;
	document.getElementById("cantidadPerdida").value = "";
	document.getElementById("motivoPerdida").value = "";
	document.getElementById("nombreProductoPerdida").textContent =
		producto.nombre;
	document.getElementById("stockActualPerdida").textContent =
		producto.stock_actual;
	document.getElementById("tipoProductoPerdida").textContent = producto.tipo;
	const modal = new bootstrap.Modal(document.getElementById("modalPerdida"));
	modal.show();
}

// Helpers para validaciones visuales
function limpiarErroresModalPerdida() {
	const modal = document.getElementById("modalPerdida");
	if (!modal) return;
	modal.querySelectorAll(".error-msg").forEach((el) => (el.textContent = ""));
	modal
		.querySelectorAll(".is-invalid")
		.forEach((el) => el.classList.remove("is-invalid"));
}

function mostrarErrorCampoPerdida(idInput, idError, mensaje) {
	const input = document.getElementById(idInput);
	const errorEl = document.getElementById(idError);
	if (input) input.classList.add("is-invalid");
	if (errorEl) errorEl.textContent = mensaje;
}

async function registrarPerdida() {
	limpiarErroresModalPerdida();
	let esValido = true;
	if (!productoSeleccionado) {
		document.getElementById("errorGeneralPerdida").textContent =
			"Debe seleccionar un producto.";
		return;
	}

	// 1. Obtener período seleccionado del header
	const selectPeriodo = document.getElementById("periodoInventario");
	if (!selectPeriodo || !selectPeriodo.value) {
		document.getElementById("errorGeneralPerdida").textContent =
			"Debe seleccionar un período válido.";
		return;
	}
	const [anioStr, mesStr] = selectPeriodo.value.split("-");

	// 2. Validar Cantidad
	const cantidadInput = document.getElementById("cantidadPerdida");
	const cantidad = Number(cantidadInput.value);
	if (isNaN(cantidad) || cantidad <= 0) {
		mostrarErrorCampoPerdida(
			"cantidadPerdida",
			"errorCantidadPerdida",
			"Ingrese una cantidad mayor a 0.",
		);
		esValido = false;
	} else if (cantidad > productoSeleccionado.stock_actual) {
		mostrarErrorCampoPerdida(
			"cantidadPerdida",
			"errorCantidadPerdida",
			"La cantidad no puede superar el stock actual.",
		);
		esValido = false;
	}

	// 3. Validar Motivo
	const motivoInput = document.getElementById("motivoPerdida");
	const motivo = motivoInput.value.trim();
	if (!motivo) {
		mostrarErrorCampoPerdida(
			"motivoPerdida",
			"errorMotivoPerdida",
			"Describe el motivo de la pérdida.",
		);
		esValido = false;
	}

	if (!esValido) return;

	const datosPerdida = {
		id_producto: productoSeleccionado.id_producto,
		anio: Number(anioStr),
		mes: Number(mesStr),
		tipo_movimiento: "PERDIDA",
		cantidad,
		observacion: motivo,
	};

	try {
		const response = await fetch("/api/perdida", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(datosPerdida),
		});
		const data = await response.json();
		if (!response.ok)
			throw new Error(data.error || "Error al registrar la pérdida.");

		// Si el backend devuelve el nuevo stock lo usas, si no, calculas la resta localmente
		const nuevoStock =
			data.nuevo_stock_actual !== undefined
				? data.nuevo_stock_actual
				: Number(productoSeleccionado.stock_actual) - cantidad;

		// Actualizamos la propiedad del objeto seleccionado
		productoSeleccionado.stock_actual = nuevoStock;

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
		const modalEl = document.getElementById("modalPerdida");
		const modal = bootstrap.Modal.getInstance(modalEl);
		if (modal) modal.hide();
	} catch (error) {
		const errGeneral = document.getElementById("errorGeneralPerdida");
		if (errGeneral) errGeneral.textContent = error.message;
	}
}

// Event Listeners
const modalPerdidaEl = document.getElementById("modalPerdida");
if (modalPerdidaEl) {
	modalPerdidaEl.addEventListener(
		"hidden.bs.modal",
		limpiarErroresModalPerdida,
	);
}
document
	.getElementById("guardarPerdida")
	.addEventListener("click", registrarPerdida);