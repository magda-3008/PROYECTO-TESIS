let tablaMD = null;
let ingredienteSeleccionado = null;

// configuración de vistas
const vistas = {
    inventarioMD: {
        endpoint: "/api/materiaprima",
        columns: [
            { title: "Insumo", field: "nombre", frozen: true, width: 160, cssClass: "columna-texto-ajustable", headerWordWrap: true, headerToolTip: true, editor: "input" },
            { title: "Tipo de insumo", field: "tipo_insumo", hozAlign: "center", minWidth: 80 },
            {
                title: "Costo de insumo", field: "costo_total_ingrediente", formatter: formatoMoneda, hozAlign: "center", minWidth: 100, headerWordWrap: true, headerTooltip: true,
                editor: "number", editorParams: { min: 0, step: 0.01 }
            },
            {
                title: "Unidad de medida",
                field: "unidad_medida",
                hozAlign: "center",
                minWidth: 100,
                headerWordWrap: true,
                headerTooltip: true
            },
            {
                title: "Cantidad por presentación",
                field: "unidad_por_paquete",
                variableHeight: true,
                hozAlign: "center",
                minWidth: 100,
                headerWordWrap: true,
                headerTooltip: true,
                editor: "number",
                editorParams: {
                    min: 0,
                    step: 0.01
                }
            },
            {
                title: "Existencia actual",
                field: "stock_actual_i",
                hozAlign: "center",
                minWidth: 80,
                headerWordWrap: true,
                headerTooltip: true
            },
            {
                title: "Acciones",
                hozAlign: "center",
                headerSort: false,
                minWidth: 120,
                formatter: function () {
                    return `
                        <div class="acciones-tabla">
                            <button class="btnAccion btnPerdida" title="Registrar pérdida">
                                <i class="bi bi-cart-dash"></i>
                            </button>

                            <button class="btnAccion btnEntrada" title="Registrar entrada">
                                <i class="bi bi-cart-plus"></i>
                            </button>

                            <button class="btnAccion btnHistorial" title="Ver historial">
                                <i class="bi bi-clock-history"></i>
                            </button>
                        </div>
                    `;
                },

                cellClick: function (e, cell) {
                    const ingrediente = cell.getRow().getData();

                    if (e.target.closest(".btnPerdida")) {
                        abrirModalPerdida(ingrediente);
                        return;
                    }

                    if (e.target.closest(".btnEntrada")) {
                        abrirModalEntrada(ingrediente);
                        return;
                    }

                    if (e.target.closest(".btnHistorial")) {
                        abrirHistorial(ingrediente);
                    }
                },
            },
        ],
    }
};

// cargar vista
async function cargarVista(vista) {

    const configuracion = vistas[vista];
    const endpoint = configuracion.endpoint;

    // Elimina la tabla anterior
    if (tablaMD) {
        tablaMD.destroy();
        tablaMD = null;
    }

    crearFiltros(vista);

    // Mostrar indicador de carga
    document.getElementById("tablaMateriaP").innerHTML = `
        <div class="tabla-cargando">
            <div class="spinner-border text-info" role="status"></div>
            <p>Cargando información...</p>
        </div>
    `;

    let datos = [];

    try {
        const respuesta = await fetch(endpoint);

        if (!respuesta.ok) {
            throw new Error("No se pudieron obtener los datos.");
        }

        datos = await respuesta.json();

    } catch (error) {
        console.error(error);

        document.getElementById("tablaMateriaP").innerHTML = `
            <div class="tabla-error">
                <i class="bi bi-exclamation-triangle-fill"></i>
                <h4>Error al cargar la información</h4>
                <p>Verifica tu conexión o inténtalo nuevamente.</p>
                <button class="btn btn-primary mt-3" onclick="cargarVista('${vista}')">
                    Reintentar
                </button>
            </div>
        `;

        return;
    }

    tablaMD = new Tabulator("#tablaMateriaP", {
        data: datos,
        tooltipGenerationMode: "hover",
        tooltips: true,
        index: "id_ma",
        layout: "fitColumns",
        columnHeaderVertAlign: "middle",
        pagination: true,
        paginationSize: 30,

        rowHeader: {
            formatter: "rownum",
            width: 40,
            hozAlign: "center",
            headerSort: false,
            frozen: true,
        },

        columns: configuracion.columns,
        placeholder: "No se encontraron resultados",
    });

    // ESCUCHA DE CAMBIOS EN CELDAS
    tablaMD.on("cellEdited", async function (cell) {

        const valorNuevo = cell.getValue();
        const valorAnterior = cell.getOldValue();

        // Si no hubo un cambio real, no hacemos la petición HTTP
        if (valorNuevo === valorAnterior) return;

        const filaData = cell.getRow().getData();
        const idMA = filaData.id_ma;
        const campoEditado = cell.getField();

        try {

            // TODO:
            // Definir posteriormente el endpoint definitivo para actualizar
            // materia prima.
            //
            // Ejemplo:
            // const respuesta = await fetch(`/api/materiaprima/${idMA}`, {
            //     method: "PATCH",
            //     headers: {
            //         "Content-Type": "application/json",
            //     },
            //     body: JSON.stringify({
            //         [campoEditado]: valorNuevo
            //     }),
            // });

            /*
            if (!respuesta.ok) {
                throw new Error("Error al guardar el cambio.");
            }
            */

            // Por ahora solo dejamos preparada la lógica visual

            cell.getElement().classList.add("celda-actualizada");

            setTimeout(() => {
                cell.getElement().classList.remove("celda-actualizada");
            }, 7000);

            Swal.fire({
                icon: "success",
                title: "Cambio guardado correctamente",
                returnFocus: false
            });

        } catch (error) {

            console.error(
                "Error al actualizar la base de datos:",
                error
            );

            // Restaurar valor anterior
            cell.setValue(valorAnterior, false);

            // Resaltar error
            cell.getElement().classList.add("celda-error");

            setTimeout(() => {
                cell.getElement().classList.remove("celda-error");
            }, 7000);

            Swal.fire({
                icon: "error",
                title: "No se pudo guardar la modificación",
                returnFocus: false
            });
        }
    });

    inicializarEventosFiltros(vista);
}

document.addEventListener("DOMContentLoaded", async () => {
    cargarVista("inventarioMD");
});