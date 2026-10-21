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
	const stock = Number(producto.stock_actual);

	document.getElementById("stockActualSalida").textContent =
		stock === 1 ? "1 unidad" : `${stock} unidades`;
	document.getElementById("tipoProductoSalida").textContent = producto.tipo;
	cargarMotivosSalida();
	const modal = new bootstrap.Modal(document.getElementById("modalSalida"));
	modal.show();
}

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

async function registrarSalida() {
	limpiarErroresModalSalida();

	let esValido = true;

	if (!productoSeleccionado) {
		document.getElementById("errorGeneralSalida").textContent =
			"Debe seleccionar un producto.";
		return;
	}

	const motivoInput =
		document.getElementById("motivoSalida");

	const motivo = motivoInput.value;

	if (!motivo) {
		mostrarErrorCampoSalida(
			"motivoSalida",
			"errorMotivoSalida",
			"Seleccione un motivo de salida."
		);

		esValido = false;
	}

	const cantidadInput =
		document.getElementById("cantidadSalida");

	const cantidad = Number(cantidadInput.value);

	if (!Number.isInteger(cantidad) || cantidad <= 0) {

		mostrarErrorCampoSalida(
			"cantidadSalida",
			"errorCantidadSalida",
			"Ingrese una cantidad entera mayor a 0."
		);

		esValido = false;

	} else if (
		cantidad >
		Number(productoSeleccionado.stock_actual)
	) {

		mostrarErrorCampoSalida(
			"cantidadSalida",
			"errorCantidadSalida",
			"La cantidad no puede superar el stock actual."
		);

		esValido = false;
	}

	if (!esValido) {
		return;
	}

	const observacion =
		document
			.getElementById("observacionSalida")
			.value
			.trim();

	const movimiento = {
		id_producto: productoSeleccionado.id_producto,
		tipo_movimiento: "SALIDA",
		motivo: motivo,
		cantidad: cantidad,
		observacion: observacion || null
	};

	try {

		const response = await fetch("/api/salida", {
			method: "POST",
			credentials: "include",
			headers: {
				"Content-Type": "application/json"
			},
			body: JSON.stringify(movimiento)
		});

		if (!response.ok) {
			await manejarErrorRespuesta(
				response,
				"Error al registrar la salida."
			);
			return;
		}

		const data = await response.json();

		const nuevoStock =
			Number(data.nuevo_stock_actual);

		productoSeleccionado.stock_actual =
			nuevoStock;

		Swal.fire({
			icon: "success",
			title: "Salida registrada",
			text: "La salida de producto se registró correctamente.",
			confirmButtonText: "Aceptar",
			returnFocus: false
		});

		if (
			typeof tabla !== "undefined" &&
			tabla
		) {
			tabla.updateData([{
				id_producto:
					productoSeleccionado.id_producto,

				stock_actual: nuevoStock
			}]);
		}

		const modalEl =
			document.getElementById("modalSalida");

		const modal =
			bootstrap.Modal.getInstance(modalEl);

		if (modal) {
			modal.hide();
		}

	} catch (error) {

		console.error(
			"Error al registrar la salida:",
			error
		);

		document.getElementById(
			"errorGeneralSalida"
		).textContent = error.message;

		Swal.fire({
			icon: "error",
			text: "No se pudo registrar la salida",
			returnFocus: false
		});
	}
}

const modalSalidaEl = document.getElementById("modalSalida");
if (modalSalidaEl) {
	modalSalidaEl.addEventListener("hidden.bs.modal", limpiarErroresModalSalida);
}
const botonGuardarSalida = document.getElementById("guardarSalida");
if (botonGuardarSalida) {
	botonGuardarSalida.addEventListener("click", registrarSalida);
}
