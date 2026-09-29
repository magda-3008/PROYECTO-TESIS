function obtenerNombreMes(mes) {
    const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const numeroMes = Number(mes);
    if (numeroMes < 1 || numeroMes > 12) {
        return mes;
    }
    return meses[numeroMes - 1];
}
/* =========================================================
   FORMATEAR CANTIDAD DE MOVIMIENTO DE MATERIA PRIMA
   ========================================================= */
function formatearCantidadMovimientoMP(cantidad, materiaPrima) {
    const cantidadNumerica = Number(cantidad);
    if (!Number.isFinite(cantidadNumerica)) {
        return `${cantidad} ${materiaPrima.unidad_medida || ""}`;
    }
    const contenidoPresentacion = Number(materiaPrima.unidad_por_paquete);
    const unidadMedida = String(materiaPrima.unidad_medida || "").trim();
    const unidadExistencia = String(materiaPrima.unidad_existencia || "").trim();
    if (!unidadMedida || !unidadExistencia || !Number.isFinite(contenidoPresentacion) || contenidoPresentacion <= 0) {
        return formatearUnidadHumana(cantidadNumerica, unidadMedida);
    }
    /*
     * Si ambas unidades son iguales,
     * no necesitamos hacer conversión.
     */
    if (unidadMedida.toLowerCase() === unidadExistencia.toLowerCase()) {
        return formatearUnidadHumana(cantidadNumerica, unidadMedida);
    }
    const presentacionesCompletas = Math.floor(cantidadNumerica / contenidoPresentacion);
    const sobrante = limpiarDecimal(cantidadNumerica - (presentacionesCompletas * contenidoPresentacion));
    /*
     * La cantidad es menor que una presentación completa.
     */
    if (presentacionesCompletas === 0) {
        const proporcion = cantidadNumerica / contenidoPresentacion;
        if (esFraccionSencilla(proporcion)) {
            return formatearUnidadHumana(proporcion, unidadExistencia);
        }
        return formatearUnidadHumana(cantidadNumerica, unidadMedida);
    }
    /*
     * La cantidad corresponde exactamente
     * a presentaciones completas.
     */
    if (sobrante === 0) {
        return formatearUnidadHumana(presentacionesCompletas, unidadExistencia);
    }
    /*
     * Presentaciones completas + sobrante.
     */
    return (`${formatearUnidadHumana(
        presentacionesCompletas,
        unidadExistencia
    )} + ` + `${formatearUnidadHumana(
        sobrante,
        unidadMedida
    )}`);
}
/* =========================================================
   CARGAR PERÍODOS
   ========================================================= */
async function cargarPeriodosHistorialMP(id_ma) {
    const select = document.getElementById("periodoHistorialMP");
    if (!select) return;
    select.innerHTML = "";
    try {
        const respuesta = await fetch(`/api/historialMP/periodos/${id_ma}`);
        if (!respuesta.ok) {
            const errorData = await respuesta.json();
            throw new Error(errorData.mensaje || "No se pudieron obtener los períodos.");
        }
        const periodos = await respuesta.json();
        if (!periodos || periodos.length === 0) {
            select.innerHTML = `
                <option value="">
                    Sin períodos
                </option>
            `;
            select.disabled = true;
            return;
        }
        periodos.forEach((periodo) => {
            const option = document.createElement("option");
            const mes = String(periodo.mes).padStart(2, "0");
            option.value = `${periodo.anio}-${mes}`;
            option.textContent = formatearPeriodo(periodo.anio, periodo.mes);
            option.dataset.anio = periodo.anio;
            option.dataset.mes = periodo.mes;
            select.appendChild(option);
        });
        /*
         * El backend devuelve los períodos
         * ordenados del más reciente al más antiguo.
         */
        select.selectedIndex = 0;
        select.disabled = false;
    } catch (error) {
        console.error("Error al cargar períodos del historial de materia prima:", error);
        select.innerHTML = `
            <option value="">
                No se pudieron cargar los períodos
            </option>
        `;
        select.disabled = true;
    }
}
/* =========================================================
   CARGAR MOVIMIENTOS
   ========================================================= */
async function cargarMovimientosHistorialMP(materiaPrima) {
    const periodoSelect = document.getElementById("periodoHistorialMP");
    const cargando = document.getElementById("cargandoHistorial");
    const tbody = document.getElementById("tablaMovimientos");
    const periodo = periodoSelect.value;
    if (!periodo) {
        cargando.classList.add("d-none");
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="text-center text-muted py-4"
                >
                    <i
                        class="bi bi-clock-history fs-4 d-block mb-2"
                    ></i>

                    No hay movimientos registrados
                    para este período.
                </td>
            </tr>
        `;
        return;
    }
    const partes = periodo.split("-");
    const anio = partes[0];
    const mes = partes[1];
    cargando.classList.remove("d-none");
    tbody.innerHTML = "";
    try {
        const respuesta = await fetch(`/api/historialMP/${materiaPrima.id_ma}?anio=${anio}&mes=${mes}`);
        if (!respuesta.ok) {
            const errorData = await respuesta.json();
            throw new Error(errorData.mensaje || "Error al cargar el historial.");
        }
        const movimientos = await respuesta.json();
        cargando.classList.add("d-none");
        if (!movimientos || movimientos.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="text-center text-muted py-4"
                    >
                        <i
                            class="bi bi-clock-history fs-4 d-block mb-2"
                        ></i>

                        No hay movimientos registrados
                        para este período.
                    </td>
                </tr>
            `;
            return;
        }
        /* =====================================================
           GENERAR FILAS
           ===================================================== */
        movimientos.forEach((mov) => {
            /* -----------------------------------------------
               FECHA
               ----------------------------------------------- */
            let fecha = "Sin fecha";
            if (mov.fecha) {
                const date = new Date(mov.fecha);
                fecha = date.toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                });
            }
            /* -----------------------------------------------
               DATOS NUMÉRICOS
               ----------------------------------------------- */
            const cantidad = Number(mov.cantidad) || 0;
            const costoTotal = Number(mov.costo_total) || 0;
            const cantidadFormateada = formatearCantidadMovimientoMP(cantidad, materiaPrima);
            /* -----------------------------------------------
               TIPO / MOTIVO
               ----------------------------------------------- */
            let motivoTexto = "";
            switch (mov.motivo) {
                case "COMPRA":
                    motivoTexto = "Compra";
                    break;
                case "PRODUCCION":
                    motivoTexto = "Producción";
                    break;
                case "VENTA":
                    motivoTexto = "Venta";
                    break;
                case "PERDIDA":
                    motivoTexto = "Pérdida";
                    break;
                case "CONSUMO":
                    motivoTexto = "Consumo";
                    break;
                case "AJUSTE":
                    motivoTexto = "Ajuste";
                    break;
                case "OTRO":
                    motivoTexto = "Otro";
                    break;
                default:
                    motivoTexto = mov.motivo || "";
            }
            let tipoBadge = "";
            let cantidadMostrar = "";
            let montoTexto = "—";
            /* =================================================
               ENTRADA
               ================================================= */
            if (mov.tipo_movimiento === "ENTRADA") {
                tipoBadge = `
                    <span class="badge bg-success">
                        Entrada · ${motivoTexto || "Entrada"}
                    </span>
                `;
                cantidadMostrar = `
                    <span class="text-success">
                        +${cantidadFormateada}
                    </span>
                `;
                /* ---------------------------------------------
                   COMPRA
                   --------------------------------------------- */
                if (mov.motivo === "COMPRA") {
                    montoTexto = `
                        <div>
                            <span
                                class="text-success font-monospace"
                            >
                                ${formatoMoneda(costoTotal)}
                            </span>

                            <small
                                class="d-block text-muted"
                            >
                                Costo de compra
                            </small>
                        </div>
                    `;
                }
                /* ---------------------------------------------
                   PRODUCCIÓN
                   --------------------------------------------- */
                else if (mov.motivo === "PRODUCCION") {
                    montoTexto = `
                        <div>
                            <span
                                class="text-success font-monospace"
                            >
                                ${formatoMoneda(costoTotal)}
                            </span>

                            <small
                                class="d-block text-muted"
                            >
                                Costo de producción
                            </small>
                        </div>
                    `;
                }
                /* ---------------------------------------------
                   AJUSTE / OTRO
                   --------------------------------------------- */
                else {
                    montoTexto = "—";
                }
            }
            /* =================================================
               SALIDA
               ================================================= */
            else if (mov.tipo_movimiento === "SALIDA") {
                tipoBadge = `
                    <span class="badge bg-danger">
                        Salida · ${motivoTexto || "Salida"}
                    </span>
                `;
                cantidadMostrar = `
                    <span class="text-danger">
                        -${cantidadFormateada}
                    </span>
                `;
                /* ---------------------------------------------
                   PÉRDIDA
                   --------------------------------------------- */
                if (mov.motivo === "PERDIDA") {
                    montoTexto = `
                        <div>
                            <span
                                class="text-danger font-monospace"
                            >
                                ${formatoMoneda(
                        Math.abs(costoTotal)
                    )}
                            </span>

                            <small
                                class="d-block text-muted"
                            >
                                Valor de la pérdida
                            </small>
                        </div>
                    `;
                }
                /* ---------------------------------------------
                   CONSUMO
                   --------------------------------------------- */
                else if (mov.motivo === "CONSUMO") {
                    montoTexto = `
                        <div>
                            <span
                                class="text-danger font-monospace"
                            >
                                ${formatoMoneda(
                        Math.abs(costoTotal)
                    )}
                            </span>

                            <small
                                class="d-block text-muted"
                            >
                                Costo de consumo
                            </small>
                        </div>
                    `;
                }
                /* ---------------------------------------------
                   AJUSTE / OTRO
                   --------------------------------------------- */
                else {
                    montoTexto = "—";
                }
            }
            /* =================================================
               TIPO DESCONOCIDO
               ================================================= */
            else {
                tipoBadge = `
                    <span class="badge bg-secondary">
                        ${mov.tipo_movimiento ||
                    "Desconocido"
                    }${motivoTexto
                        ? ` · ${motivoTexto}`
                        : ""
                    }
                    </span>
                `;
                cantidadMostrar = cantidadFormateada;
                montoTexto = "—";
            }
            /* =================================================
               CREAR FILA
               ================================================= */
            const row = document.createElement("tr");
            row.innerHTML = `
                <td>
                    <small>
                        ${fecha}
                    </small>
                </td>

                <td>
                    ${tipoBadge}
                </td>

                <td>
                    <strong>
                        ${cantidadMostrar}
                    </strong>
                </td>

                <td>
                    ${montoTexto}
                </td>

                <td>
                    <small class="text-muted">
                        ${mov.observacion || "—"}
                    </small>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Error al cargar movimientos:", error);
        cargando.classList.add("d-none");
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="text-center text-danger"
                >
                    Error al cargar el historial:
                    ${error.message}
                </td>
            </tr>
        `;
    }
}
/* =========================================================
   ABRIR HISTORIAL
   ========================================================= */
async function abrirHistorialMP(materiaPrima) {
    document.getElementById("nombreMateriaPrimaHistorial").textContent = materiaPrima.nombre;
    document.getElementById("tipoMateriaPrimaHistorial").textContent = materiaPrima.tipo_insumo;
    document.getElementById("stockActualHistorial").textContent = formatearStockMateriaPrima(materiaPrima);
    const cargando = document.getElementById("cargandoHistorial");
    const tbody = document.getElementById("tablaMovimientos");
    const select = document.getElementById("periodoHistorialMP");
    /* -----------------------------------------------
       Estado inicial
       ----------------------------------------------- */
    cargando.classList.remove("d-none");
    tbody.innerHTML = "";
    select.innerHTML = "";
    select.disabled = true;
    try {
        await cargarPeriodosHistorialMP(materiaPrima.id_ma);
        if (select.options.length > 0 && select.value) {
            await cargarMovimientosHistorialMP(materiaPrima);
        } else {
            cargando.classList.add("d-none");
            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="text-center text-muted py-4"
                    >
                        <i
                            class="bi bi-clock-history fs-4 d-block mb-2"
                        ></i>

                        No hay movimientos registrados
                        para esta materia prima.
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error("Error al abrir historial de materia prima:", error);
        cargando.classList.add("d-none");
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="text-center text-danger"
                >
                    Error al cargar el historial:
                    ${error.message}
                </td>
            </tr>
        `;
    }
    /* -----------------------------------------------
       Cambio de período
       ----------------------------------------------- */
    select.onchange = async function () {
        if (!this.value) {
            return;
        }
        await cargarMovimientosHistorialMP(materiaPrima);
    };
    /* -----------------------------------------------
       Mostrar modal
       ----------------------------------------------- */
    const modal = new bootstrap.Modal(document.getElementById("modalHistorialMP"));
    modal.show();
}
/* =========================================================
   FORMATEAR PERÍODO
   ========================================================= */
function formatearPeriodo(anio, mes) {
    const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const numeroMes = Number(mes);
    if (numeroMes < 1 || numeroMes > 12) {
        return `${mes} ${anio}`;
    }
    return `
        ${nombresMeses[numeroMes - 1]}
        ${anio}
    `;
}
