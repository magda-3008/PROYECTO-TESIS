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
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-clock-history fs-4 d-block mb-2"></i>
                        No hay movimientos registrados este mes para este producto.
                    </td>
                </tr>
            `;
		} else {
			// Ahora usamos la función global de utilidades (ya no definimos una interna)
			// Asegúrate de que 'formatearValorMoneda' esté disponible en este ámbito
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
				// Badge y formateo de costo según tipo
				let tipoBadge = '';
				let montoTexto = '—';
				switch (mov.tipo_movimiento) {
					case 'COMPRA':
						tipoBadge = '<span class="badge bg-success">Compra</span>';
						montoTexto = formatoMoneda(mov.costo_total);
						break;
					case 'PRODUCCION':
						tipoBadge = '<span class="badge bg-warning text-dark">Producción</span>';
						montoTexto = formatoMoneda(mov.costo_total);
						break;
					case 'ENTRADA':
						tipoBadge = '<span class="badge bg-info text-dark">Ajuste +</span>';
						// No mostramos monto para entradas (o podrías mostrar el costo si aplica)
						montoTexto = '—';
						break;
					case 'PERDIDA':
						tipoBadge = '<span class="badge bg-danger">Pérdida</span>';
						// Mostramos el valor absoluto con signo negativo usando el formateador
						// Si 'costo_total' ya viene negativo, usa directamente formatearValorMoneda(mov.costo_total)
						// Si viene positivo, le anteponemos el signo menos
						const valorPerdida = Number(mov.costo_total);
						if (!isNaN(valorPerdida) && valorPerdida > 0) {
							montoTexto = `<span class="text-danger font-monospace">${formatoMoneda(-valorPerdida)}</span>`;
						} else {
							// Si ya es negativo, lo formateamos tal cual (se mostrará con signo menos)
							montoTexto = `<span class="text-danger font-monospace">${formatoMoneda(valorPerdida)}</span>`;
						}
						break;
					default:
						tipoBadge = `<span class="badge bg-secondary">${mov.tipo_movimiento}</span>`;
						montoTexto = formatoMoneda(mov.costo_total);
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
                    <td>${montoTexto}</td>
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
                <td colspan="5" class="text-center text-danger">
                    Error al cargar el historial: ${error.message}
                </td>
            </tr>
        `;
	}
	// Abrir el modal
	const modal = new bootstrap.Modal(document.getElementById('modalHistorial'));
	modal.show();
}
