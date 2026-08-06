function formatearMonto(valor) {
	const numero = Number(valor);
	if (isNaN(numero)) return "";
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency: "NIO",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(numero);
}

function formatoMoneda(cell) {
	return formatearMonto(cell.getValue());
}
async function abrirHistorial(producto) {
	document.getElementById("nombreProductoHistorial").textContent = producto.nombre;
	document.getElementById("tipoProductoHistorial").textContent = producto.tipo;
	document.getElementById("stockActualHistorial").textContent = producto.stock_actual || 0;
	const cargando = document.getElementById("cargandoHistorial");
	cargando.classList.remove("d-none");
	const tbody = document.getElementById("tablaMovimientos");
	tbody.innerHTML = "";
	const periodo = document.getElementById("periodoInventario").value;
	const [anio, mes] = periodo.split("-");
	const periodoSelect = document.getElementById("periodoInventario");
	const textoPeriodo = periodoSelect.options[periodoSelect.selectedIndex].text;
	document.getElementById("periodoHistorial").textContent = textoPeriodo;
	try {
		const respuesta = await fetch(`/api/historial/${producto.id_producto}?anio=${anio}&mes=${mes}`);
		if (!respuesta.ok) {
			const errorData = await respuesta.json();
			throw new Error(errorData.mensaje || "Error al cargar el historial");
		}
		const movimientos = await respuesta.json();
		cargando.classList.add("d-none");
		if (!movimientos || movimientos.length === 0) {
			tbody.innerHTML = `
				<tr>
					<td colspan="5" class="text-center text-muted py-4">
						<i class="bi bi-clock-history fs-4 d-block mb-2"></i>
						No hay movimientos registrados este mes para este producto.
					</td>
				</tr>
			`;
		} else {
			movimientos.forEach(mov => {
				const row = document.createElement("tr");
				row.innerHTML = `
				<td><small>${formatearFecha(mov.fecha)}</small></td>
				<td>${mov.tipo_movimiento}</td>
				<td><strong>${mov.cantidad || 0}</strong></td>
				<td>${formatearMonto(mov.monto)}</td>
				<td><small class="text-muted">${mov.observacion || "—"}</small></td>
    `;
				tbody.appendChild(row);
			});
		}
	} catch (error) {
		console.error("Error al cargar historial:", error);
		cargando.classList.add("d-none");
		tbody.innerHTML = `
			<tr>
				<td colspan="5" class="text-center text-danger">
					Error al cargar el historial: ${error.message}
				</td>
			</tr>
		`;
	}
	const modal = new bootstrap.Modal(document.getElementById("modalHistorial"));
	modal.show();
}
