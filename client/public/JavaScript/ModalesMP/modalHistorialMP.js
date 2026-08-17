function obtenerNombreMes(mes) {
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    return meses[Number(mes) - 1];
}
async function cargarPeriodosHistorialMP(id_ma) {
    const select = document.getElementById("periodoHistorialMP");
    if (!select) return;
    select.innerHTML = `
        <option value="">Seleccionar período</option>
    `;
    try {
        const respuesta = await fetch(`/api/historial/periodos/${id_ma}`);
        if (!respuesta.ok) {
            throw new Error("No se pudieron obtener los períodos.");
        }
        const periodos = await respuesta.json();
        periodos.forEach((periodo) => {
            const option = document.createElement("option");
            const mes = String(periodo.mes).padStart(2, "0");
            option.value = `${periodo.anio}-${mes}`;
            option.textContent = `${obtenerNombreMes(periodo.mes)} ${periodo.anio}`;
            select.appendChild(option);
        });
        // Seleccionar automáticamente el período más reciente
        if (periodos.length > 0) {
            const periodoMasReciente = periodos[0];
            const mes = String(periodoMasReciente.mes).padStart(2, "0");
            select.value = `${periodoMasReciente.anio}-${mes}`;
        }
    } catch (error) {
        console.error("Error al cargar períodos:", error);
    }
}
async function cargarMovimientosHistorialMP(ingrediente) {
    const periodoSelect = document.getElementById("periodoHistorialMP");
    const periodo = periodoSelect.value;
    const tbody = document.getElementById("tablaMovimientos");
    const cargando = document.getElementById("cargandoHistorial");
    // Si no hay período seleccionado
    if (!periodo) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-4">
                    <i class="bi bi-calendar3 fs-4 d-block mb-2"></i>
                    Seleccione un período para consultar los movimientos.
                </td>
            </tr>
        `;
        return;
    }
    const [anio, mes] = periodo.split("-");
    const textoPeriodo = periodoSelect.options[periodoSelect.selectedIndex].text;
    const elementoPeriodo = document.getElementById("periodoHistorial");
    if (elementoPeriodo) {
        elementoPeriodo.textContent = textoPeriodo;
    }
    // Mostrar carga
    cargando.classList.remove("d-none");
    // Limpiar tabla
    tbody.innerHTML = "";
    try {
        const respuesta = await fetch(`/api/historial/${ingrediente.id_ma}?anio=${anio}&mes=${mes}`);
        if (!respuesta.ok) {
            const errorData = await respuesta.json();
            throw new Error(errorData.mensaje || "Error al cargar el historial");
        }
        const movimientos = await respuesta.json();
        // Ocultar carga
        cargando.classList.add("d-none");
        if (!movimientos || movimientos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5"
                        class="text-center text-muted py-4">
                        <i class="bi bi-clock-history fs-4 d-block mb-2"></i>
                        No hay movimientos registrados
                        este mes para esta materia prima.
                    </td>
                </tr>
            `;
            return;
        }
        movimientos.forEach((mov) => {
            let fecha = "Sin fecha";
            if (mov.fecha) {
                const date = new Date(mov.fecha);
                fecha = date.toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                });
            } else if (mov.anio && mov.mes) {
                fecha = `${mov.mes}/${mov.anio}`;
            }
            let tipoBadge = "";
            let montoTexto = "—";
            switch (mov.tipo_movimiento) {
                case "COMPRA":
                    tipoBadge = '<span class="badge bg-success">Compra</span>';
                    montoTexto = formatoMoneda(mov.costo_total);
                    break;
                case "ENTRADA":
                    tipoBadge = '<span class="badge bg-info text-dark">Ajuste +</span>';
                    if (mov.costo_total != null && !isNaN(mov.costo_total)) {
                        montoTexto = formatoMoneda(mov.costo_total);
                    } else {
                        montoTexto = "—";
                    }
                    break;
                case "CONSUMO":
                    tipoBadge = '<span class="badge bg-warning text-dark">Consumo</span>';
                    montoTexto = formatoMoneda(mov.costo_total);
                    break;
                case "PERDIDA":
                    tipoBadge = '<span class="badge bg-danger">Pérdida</span>';
                    const valorPerdida = Number(mov.costo_total);
                    if (!isNaN(valorPerdida) && valorPerdida > 0) {
                        montoTexto = `<span class="text-danger font-monospace">
                                ${formatoMoneda(-valorPerdida)}
                            </span>`;
                    } else {
                        montoTexto = `<span class="text-danger font-monospace">
                                ${formatoMoneda(valorPerdida)}
                            </span>`;
                    }
                    break;
                default:
                    tipoBadge = `<span class="badge bg-secondary">
                            ${mov.tipo_movimiento}
                        </span>`;
                    montoTexto = formatoMoneda(mov.costo_total);
            }
            const cant = Number(mov.cantidad) || 0;
            const cantidad = decimalAFraccion(cant);
            let cantidadMostrar = "";
            if (mov.tipo_movimiento === "PERDIDA" || mov.tipo_movimiento === "CONSUMO") {
                cantidadMostrar = `<span class="text-danger">
                        -${cantidad}
                    </span>`;
            } else {
                cantidadMostrar = `<span class="text-success">
                        +${cantidad}
                    </span>`;
            }
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <small>${fecha}</small>
                </td>
                <td>${tipoBadge}</td>
                <td><strong>${cantidadMostrar}</strong></td>
                <td>${montoTexto}</td>
                <td><small class="text-muted">${mov.observacion || "—"}</small></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Error al cargar historial:", error);
        cargando.classList.add("d-none");
        tbody.innerHTML = `
            <tr>
                <td colspan="5"
                    class="text-center text-danger">

                    Error al cargar el historial:
                    ${error.message}

                </td>
            </tr>
        `;
    }
}

async function abrirHistorialMP(ingrediente) {
    document.getElementById("nombreMateriaPrimaHistorial").textContent = ingrediente.nombre;
    document.getElementById("tipoMateriaPrimaHistorial").textContent = ingrediente.tipo_insumo;
    document.getElementById("stockActualHistorial").textContent = ingrediente.stock_actual_i || 0;

    const cargando = document.getElementById("cargandoHistorial");
    cargando.classList.remove("d-none");

    document.getElementById("tablaMovimientos").innerHTML = "";

    await cargarPeriodosHistorialMP(ingrediente.id_ma);

    await cargarMovimientosHistorialMP(ingrediente);

    const select = document.getElementById("periodoHistorialMP");

    select.onchange = () => {
        cargarMovimientosHistorialMP(ingrediente);
    };

    const modal = new bootstrap.Modal(document.getElementById("modalHistorialMP"));
    modal.show();
}
