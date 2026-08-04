async function abrirHistorial(producto) {
	document.getElementById('nombreProductoHistorial').textContent = producto.nombre;
	document.getElementById('tipoProductoHistorial').textContent = producto.tipo;
	document.getElementById('stockActualHistorial').textContent = producto.stock_actual || 0;
	// Mostrar indicador de carga
	const cargando = document.getElementById('cargandoHistorial');
	cargando.classList.remove('d-none');
	// Limpiar tabla anterior
	const tbody = document.getElementById('tablaMovimientos');
	tbody.innerHTML = '';
	// Obtener período seleccionado
	const periodo = document.getElementById("periodoInventario").value;
	const [anio, mes] = periodo.split("-");
	const periodoSelect = document.getElementById("periodoInventario");
	const textoPeriodo = periodoSelect.options[periodoSelect.selectedIndex].text;
	document.getElementById("periodoHistorial").textContent = textoPeriodo;
	try {
		const respuesta = await fetch(`/api/historial/${producto.id_producto}?anio=${anio}&mes=${mes}`);
		if (!respuesta.ok) {
			const errorData = await respuesta.json();
			throw new Error(errorData.mensaje || 'Error al cargar el historial');
		}
		const movimientos = await respuesta.json();
		// Ocultar indicador de carga
		cargando.classList.add('d-none');
		if (!movimientos || movimientos.length === 0) {
			tbody.innerHTML = `
				<tr>
					<td colspan="4" class="text-center text-muted py-4">
						<i class="bi bi-clock-history fs-4 d-block mb-2"></i>
						Aún no hay movimientos registrados este mes.
					</td>
				</tr>
			`;
		} else {
			// Renderizar los movimientos
			movimientos.forEach(mov => {
				// Formatear fecha
				let fecha = 'Sin fecha';
				if (mov.fecha) {
					const date = new Date(mov.fecha);
					fecha = date.toLocaleDateString('es-ES', {
						year: 'numeric',
						month: 'short',
						day: 'numeric'
					});
				} else if (mov.anio && mov.mes) {
					fecha = `${mov.mes}/${mov.anio}`;
				}
				// Badge según tipo
				let tipoBadge = '';
				switch (mov.tipo_movimiento) {
					case 'COMPRA':
						tipoBadge = '<span class="badge bg-success">Compra</span>';
						break;
					case 'PRODUCCION':
						tipoBadge = '<span class="badge bg-warning text-dark">Producción</span>';
						break;
					case 'ENTRADA':
						tipoBadge = '<span class="badge bg-info text-dark">Ajuste</span>';
						break;
					default:
						tipoBadge = `<span class="badge bg-secondary">${mov.tipo_movimiento}</span>`;
				}
				// Mostrar cantidad
				let cantidadMostrar = mov.cantidad;
				if (mov.tipo_movimiento === 'PRODUCCION') {
					cantidadMostrar = `${mov.cantidad} lotes`;
				}
				const row = document.createElement('tr');
				row.innerHTML = `
					<td><small>${fecha}</small></td>
					<td>${tipoBadge}</td>
					<td><strong>${cantidadMostrar}</strong></td>
					<td><small class="text-muted">${mov.observacion || '—'}</small></td>
				`;
				tbody.appendChild(row);
			});
		}
	} catch (error) {
		console.error('Error al cargar historial:', error);
		cargando.classList.add('d-none');
		tbody.innerHTML = `
			<tr>
				<td colspan="4" class="text-center text-danger">
					Error al cargar el historial: ${error.message}
				</td>
			</tr>
		`;
	}
	// Abrir el modal siempre
	const modal = new bootstrap.Modal(document.getElementById('modalHistorial'));
	modal.show();
}
