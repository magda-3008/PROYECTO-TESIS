function obtenerNombreMes(mes) {
    const meses = [
        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre"
    ];

    return meses[Number(mes) - 1];
}


/*
 * Formatea la cantidad de un movimiento de materia prima
 * utilizando la unidad normalizada del inventario y,
 * cuando corresponde, la presentación de compra.
 *
 * Ejemplos:
 * 400 ml con presentación de 400 ml → 1 botella
 * 200 ml con presentación de 400 ml → ½ botella
 * 50 ml → 50 mililitros
 * 454 g con presentación de 454 g → 1 libra
 */
function formatearCantidadMovimientoMP(cantidad, materiaPrima) {
    const cantidadNumerica = Number(cantidad);

    if (!Number.isFinite(cantidadNumerica)) {
        return `${cantidad} ${materiaPrima.unidad_medida || ""}`;
    }

    const contenidoPresentacion =
        Number(materiaPrima.unidad_por_paquete);

    const unidadMedida =
        String(materiaPrima.unidad_medida || "").trim();

    const unidadExistencia =
        String(materiaPrima.unidad_existencia || "").trim();

    if (
        !unidadMedida ||
        !unidadExistencia ||
        !Number.isFinite(contenidoPresentacion) ||
        contenidoPresentacion <= 0
    ) {
        return formatearUnidadHumana(
            cantidadNumerica,
            unidadMedida
        );
    }

    /*
     * Si la unidad de medida y la unidad de existencia
     * son iguales, la cantidad ya está expresada directamente
     * en la unidad utilizada para el inventario.
     *
     * Ejemplo:
     * Unidad / Unidad
     * Libra / Libra
     * Litro / Litro
     */
    if (
        unidadMedida.toLowerCase() ===
        unidadExistencia.toLowerCase()
    ) {
        return formatearUnidadHumana(
            cantidadNumerica,
            unidadMedida
        );
    }

    const presentacionesCompletas = Math.floor(
        cantidadNumerica / contenidoPresentacion
    );

    const sobrante = limpiarDecimal(
        cantidadNumerica -
        (presentacionesCompletas * contenidoPresentacion)
    );

    /*
     * La cantidad es menor que una presentación completa.
     */
    if (presentacionesCompletas === 0) {
        const proporcion =
            cantidadNumerica / contenidoPresentacion;

        if (esFraccionSencilla(proporcion)) {
            return formatearUnidadHumana(
                proporcion,
                unidadExistencia
            );
        }

        return formatearUnidadHumana(
            cantidadNumerica,
            unidadMedida
        );
    }

    /*
     * La cantidad corresponde exactamente a una
     * o varias presentaciones completas.
     */
    if (sobrante === 0) {
        return formatearUnidadHumana(
            presentacionesCompletas,
            unidadExistencia
        );
    }

    /*
     * La cantidad contiene presentaciones completas
     * más una cantidad restante en la unidad normalizada.
     */
    return (
        `${formatearUnidadHumana(
            presentacionesCompletas,
            unidadExistencia
        )} + ` +
        `${formatearUnidadHumana(
            sobrante,
            unidadMedida
        )}`
    );
}


/*
 * Carga los períodos en los que existen movimientos
 * registrados para la materia prima.
 */
async function cargarPeriodosHistorialMP(id_ma) {
    const select =
        document.getElementById("periodoHistorialMP");

    if (!select) return;

    select.innerHTML = `
        <option value="">
            Seleccionar período
        </option>
    `;

    try {
        const respuesta = await fetch(
            `/api/historialMP/periodos/${id_ma}`
        );

        if (!respuesta.ok) {
            throw new Error(
                "No se pudieron obtener los períodos."
            );
        }

        const periodos = await respuesta.json();

        periodos.forEach((periodo) => {
            const option =
                document.createElement("option");

            const mes =
                String(periodo.mes).padStart(2, "0");

            option.value =
                `${periodo.anio}-${mes}`;

            option.textContent =
                `${obtenerNombreMes(periodo.mes)} ${periodo.anio}`;

            select.appendChild(option);
        });

        /*
         * Seleccionar automáticamente el período
         * más reciente.
         */
        if (periodos.length > 0) {
            const periodoMasReciente =
                periodos[0];

            const mes =
                String(periodoMasReciente.mes).padStart(2, "0");

            select.value =
                `${periodoMasReciente.anio}-${mes}`;
        }

    } catch (error) {
        console.error(
            "Error al cargar períodos del historial de materia prima:",
            error
        );

        select.innerHTML = `
            <option value="">
                No se pudieron cargar los períodos
            </option>
        `;
    }
}


/*
 * Carga los movimientos correspondientes al período
 * seleccionado.
 */
async function cargarMovimientosHistorialMP(ingrediente) {
    const periodoSelect =
        document.getElementById("periodoHistorialMP");

    const periodo =
        periodoSelect.value;

    const tbody =
        document.getElementById("tablaMovimientos");

    const cargando =
        document.getElementById("cargandoHistorial");

    if (!periodo) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="text-center text-muted py-4"
                >
                    <i
                        class="bi bi-calendar3 fs-4 d-block mb-2"
                    ></i>

                    Seleccione un período para consultar
                    los movimientos.
                </td>
            </tr>
        `;

        return;
    }

    const [anio, mes] =
        periodo.split("-");

    const textoPeriodo =
        periodoSelect.options[
            periodoSelect.selectedIndex
        ].text;

    const elementoPeriodo =
        document.getElementById("periodoHistorial");

    if (elementoPeriodo) {
        elementoPeriodo.textContent =
            textoPeriodo;
    }

    cargando.classList.remove("d-none");

    tbody.innerHTML = "";

    try {
        const respuesta = await fetch(
            `/api/historialMP/${ingrediente.id_ma}?anio=${anio}&mes=${mes}`
        );

        if (!respuesta.ok) {
            const errorData =
                await respuesta.json();

            throw new Error(
                errorData.mensaje ||
                "Error al cargar el historial."
            );
        }

        const movimientos =
            await respuesta.json();

        cargando.classList.add("d-none");

        if (
            !movimientos ||
            movimientos.length === 0
        ) {
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
                        este mes para esta materia prima.
                    </td>
                </tr>
            `;

            return;
        }

        movimientos.forEach((mov) => {

            /*
             * Fecha
             */
            let fecha = "Sin fecha";

            if (mov.fecha) {
                const date =
                    new Date(mov.fecha);

                fecha =
                    date.toLocaleDateString(
                        "es-ES",
                        {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        }
                    );
            } else if (
                mov.anio &&
                mov.mes
            ) {
                fecha =
                    `${mov.mes}/${mov.anio}`;
            }


            /*
             * Tipo de movimiento
             */
            let tipoBadge = "";
            let montoTexto = "—";

            switch (mov.tipo_movimiento) {

                case "COMPRA":

                    tipoBadge =
                        `
                        <span class="badge bg-success">
                            Compra
                        </span>
                        `;

                    montoTexto =
                        formatoMoneda(
                            mov.costo_total
                        );

                    break;


                case "ENTRADA":

                    tipoBadge =
                        `
                        <span class="badge bg-info text-dark">
                            Ajuste +
                        </span>
                        `;

                    if (
                        mov.costo_total != null &&
                        !isNaN(mov.costo_total)
                    ) {
                        montoTexto =
                            formatoMoneda(
                                mov.costo_total
                            );
                    } else {
                        montoTexto = "—";
                    }

                    break;


                case "CONSUMO":

                    tipoBadge =
                        `
                        <span class="badge bg-warning text-dark">
                            Consumo
                        </span>
                        `;

                    montoTexto =
                        formatoMoneda(
                            mov.costo_total
                        );

                    break;


                case "PERDIDA":

                    tipoBadge =
                        `
                        <span class="badge bg-danger">
                            Pérdida
                        </span>
                        `;

                    const valorPerdida =
                        Number(
                            mov.costo_total
                        );

                    if (
                        !isNaN(valorPerdida) &&
                        valorPerdida > 0
                    ) {
                        montoTexto =
                            `
                            <span
                                class="text-danger font-monospace"
                            >
                                ${formatoMoneda(
                                -valorPerdida
                            )}
                            </span>
                            `;
                    } else {
                        montoTexto =
                            `
                            <span
                                class="text-danger font-monospace"
                            >
                                ${formatoMoneda(
                                valorPerdida
                            )}
                            </span>
                            `;
                    }

                    break;


                default:

                    tipoBadge =
                        `
                        <span class="badge bg-secondary">
                            ${mov.tipo_movimiento || "Desconocido"}
                        </span>
                        `;

                    montoTexto =
                        formatoMoneda(
                            mov.costo_total
                        );
            }


            /*
             * Cantidad del movimiento.
             *
             * Importante:
             * Se utiliza la unidad normalizada del
             * inventario y la presentación configurada
             * para la materia prima.
             */
            const cant =
                Number(mov.cantidad) || 0;

            const cantidadFormateada =
                formatearCantidadMovimientoMP(
                    cant,
                    ingrediente
                );

            let cantidadMostrar = "";


            /*
             * Consumos y pérdidas representan
             * disminuciones del inventario.
             */
            if (
                mov.tipo_movimiento === "PERDIDA" ||
                mov.tipo_movimiento === "CONSUMO"
            ) {
                cantidadMostrar =
                    `
                    <span class="text-danger">
                        -${cantidadFormateada}
                    </span>
                    `;
            }

            /*
             * Compras y entradas representan
             * aumentos del inventario.
             */
            else {
                cantidadMostrar =
                    `
                    <span class="text-success">
                        +${cantidadFormateada}
                    </span>
                    `;
            }


            /*
             * Crear fila
             */
            const row =
                document.createElement("tr");

            row.innerHTML =
                `
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

        console.error(
            "Error al cargar historial:",
            error
        );

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
    } finally {
        cargando.classList.add("d-none");
    }
}


/*
 * Abre el modal de historial de materia prima.
 */
async function abrirHistorialMP(ingrediente) {

    document.getElementById(
        "nombreMateriaPrimaHistorial"
    ).textContent =
        ingrediente.nombre;


    document.getElementById(
        "tipoMateriaPrimaHistorial"
    ).textContent =
        ingrediente.tipo_insumo;


    /*
     * Utilizamos la misma función que se utiliza
     * en la tabla principal de materias primas.
     *
     * Así el stock se representa de la misma manera
     * en ambos lugares.
     */
    document.getElementById(
        "stockActualHistorial"
    ).textContent =
        formatearStockMateriaPrima(
            ingrediente
        );


    document.getElementById(
        "tablaMovimientos"
    ).innerHTML = "";


    /*
     * Cargar períodos disponibles.
     */
    await cargarPeriodosHistorialMP(
        ingrediente.id_ma
    );


    /*
     * Cargar automáticamente el período
     * más reciente.
     */
    await cargarMovimientosHistorialMP(
        ingrediente
    );


    /*
     * Actualizar el historial cuando el usuario
     * cambia de período.
     */
    const select =
        document.getElementById(
            "periodoHistorialMP"
        );

    select.onchange = () => {
        cargarMovimientosHistorialMP(
            ingrediente
        );
    };


    /*
     * Mostrar modal.
     */
    const modal =
        new bootstrap.Modal(
            document.getElementById(
                "modalHistorialMP"
            )
        );

    modal.show();
}