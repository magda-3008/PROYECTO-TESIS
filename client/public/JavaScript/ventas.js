"use strict";
// ============================================================
// CONFIGURACIÓN
// ============================================================
const API_URL = "/api/ventas";
const MONEDA = "C$";
// ============================================================
// VARIABLES
// ============================================================
let ventasDiarias = [];
let datosSemanales = [];
let datosMensuales = [];
let productoMasVendido = null;
let tablaVentas = null;
let graficoSemanal = null;
let graficoMensual = null;
// ============================================================
// ELEMENTOS HTML
// ============================================================
let mensaje;
let fechaInicio;
let fechaFin;
let kpiTotal;
let kpiCount;
let kpiDiscounts;
let bestShare;
let bestImage;
let bestName;
let bestQuantity;
let bestTotal;
let generatedDate;
// ============================================================
// FUNCIONES GENERALES
// ============================================================
function mostrarMensaje(texto, tipo = "") {
    if (!mensaje) {
        return;
    }
    mensaje.textContent = texto;
    mensaje.className = "mensaje";
    if (tipo) {
        mensaje.classList.add(tipo);
    }
}
// ============================================================
// FORMATEAR MONEDA
// ============================================================
function formatearMoneda(valor) {
    const numero = Number(valor) || 0;
    return (MONEDA + " " + numero.toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }));
}
// ============================================================
// FORMATEAR FECHA
// ============================================================
function formatearFecha(fecha) {
    if (!fecha) {
        return "Sin fecha";
    }
    const coincidencia = String(fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (coincidencia) {
        return `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`;
    }
    const fechaConvertida = new Date(fecha);
    if (Number.isNaN(fechaConvertida.getTime())) {
        return String(fecha);
    }
    return fechaConvertida.toLocaleDateString("es-NI");
}
// ============================================================
// OBTENER FECHA ACTUAL EN FORMATO YYYY-MM-DD
// ============================================================
function obtenerFechaActual() {
    const ahora = new Date();
    const anio = ahora.getFullYear();
    const mes = String(ahora.getMonth() + 1).padStart(2, "0");
    const dia = String(ahora.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function obtenerRangoFechas() {
    const desde = fechaInicio?.value;
    const hasta = fechaFin?.value;

    if (!desde || !hasta) {
        throw new Error("Selecciona las fechas desde y hasta.");
    }

    if (desde > hasta) {
        throw new Error(
            "La fecha desde no puede ser posterior a la fecha hasta."
        );
    }

    return {
        desde,
        hasta
    };
}
// ============================================================
// ESCAPAR HTML
// ============================================================
function escaparHTML(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caracter]);
}
// ============================================================
// PETICIÓN A LA API
// ============================================================
async function obtenerDatos(endpoint) {
    const respuesta = await fetch(`${API_URL}${endpoint}`);
    let datos = null;
    try {
        datos = await respuesta.json();
    } catch {
        throw new Error(`El servidor respondió con un formato no válido. Código: ${respuesta.status}`);
    }
    if (!respuesta.ok) {
        throw new Error(datos?.mensaje || `Error del servidor (${respuesta.status}).`);
    }
    return datos;
}
// ============================================================
// NORMALIZAR VENTA DIARIA
// ============================================================
function normalizarVenta(venta) {
    const detalles = Array.isArray(venta.detalles) ? venta.detalles : [];
    const productos = detalles.map(detalle => {
        const nombre = detalle.nombre || `Producto ${detalle.id_producto}`;
        const cantidad = Number(detalle.cantidad) || 0;
        return `${cantidad} × ${nombre}`;
    }).join(", ");
    return {
        id: venta.id_venta,
        fecha: venta.fecha,
        fechaFormateada: formatearFecha(venta.fecha),
        productos: productos || "Detalle no disponible",
        total: Number(venta.total) || 0,
        estado: "Completada",
        detalles
    };
}
// ============================================================
// CARGAR VENTAS DIARIAS
// ============================================================
async function cargarVentasDiarias(desde, hasta) {
    try {
        const datos = await obtenerDatos(
            `/diarias?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
        );

        ventasDiarias = Array.isArray(datos)
            ? datos.map(normalizarVenta)
            : [];

        actualizarTabla(ventasDiarias);
        actualizarKPIs();

        return ventasDiarias;

    } catch (error) {
        console.error("Error al cargar ventas del rango:", error);

        ventasDiarias = [];

        actualizarTabla([]);
        actualizarKPIs();

        throw error;
    }
}
// ============================================================
// CARGAR RESUMEN SEMANAL
// ============================================================
async function cargarDatosSemanales(desde, hasta) {
    try {
        const datos = await obtenerDatos(
            `/semanales?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
        );

        datosSemanales = Array.isArray(datos)
            ? datos
            : [];

        crearGraficoSemanal(datosSemanales);

        return datosSemanales;

    } catch (error) {
        console.error("Error al cargar resumen por día:", error);

        datosSemanales = [];

        crearGraficoSemanal([]);

        throw error;
    }
}
// ============================================================
// CARGAR RESUMEN MENSUAL
// ============================================================
async function cargarDatosMensuales(desde, hasta) {
    try {
        const datos = await obtenerDatos(
            `/mensuales?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
        );

        datosMensuales = Array.isArray(datos)
            ? datos
            : [];

        crearGraficoMensual(datosMensuales);

        return datosMensuales;

    } catch (error) {
        console.error("Error al cargar resumen mensual:", error);

        datosMensuales = [];

        crearGraficoMensual([]);

        throw error;
    }
}
// ============================================================
// CARGAR PRODUCTO MÁS VENDIDO
// ============================================================
async function cargarProductoMasVendido(desde, hasta) {
    try {
        const datos = await obtenerDatos(
            `/producto-mas-vendido?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`
        );

        productoMasVendido = datos;

        actualizarProductoMasVendido();

        return productoMasVendido;

    } catch (error) {
        console.error("Error al cargar producto más vendido:", error);

        productoMasVendido = null;

        actualizarProductoMasVendido();

        throw error;
    }
}
// ============================================================
// CARGAR TODO EL REPORTE
// ============================================================
async function cargarReporte() {
    const boton = document.getElementById("apply-filters");

    if (boton) {
        boton.disabled = true;
    }

    mostrarMensaje("Cargando reporte...");

    try {
        const { desde, hasta } = obtenerRangoFechas();

        await Promise.all([
            cargarVentasDiarias(desde, hasta),
            cargarDatosSemanales(desde, hasta),
            cargarDatosMensuales(desde, hasta),
            cargarProductoMasVendido(desde, hasta)
        ]);

        actualizarFechaGeneracion();

        mostrarMensaje(
            "Reporte cargado correctamente.",
            "exito"
        );

    } catch (error) {
        console.error("Error al cargar el reporte:", error);

        mostrarMensaje(
            "No se pudo cargar el reporte. " + error.message,
            "error"
        );

    } finally {
        if (boton) {
            boton.disabled = false;
        }
    }
}
// ============================================================
// ACTUALIZAR KPIs
// ============================================================
function actualizarKPIs() {
    const total = ventasDiarias.reduce(
        (suma, venta) => suma + Number(venta.total || 0), 0);
    const cantidadVentas = ventasDiarias.length;
    if (kpiTotal) {
        kpiTotal.textContent = formatearMoneda(total);
    }
    if (kpiCount) {
        kpiCount.textContent = cantidadVentas.toLocaleString("es-NI");
    }
    /*
     * Actualmente la tabla venta no almacena
     * descuentos como un campo independiente.
     *
     * Por eso el KPI permanece en C$ 0.00.
     */
    if (kpiDiscounts) {
        kpiDiscounts.textContent = formatearMoneda(0);
    }
}
// ============================================================
// PRODUCTO MÁS VENDIDO
// ============================================================
function actualizarProductoMasVendido() {
    if (!productoMasVendido) {
        if (bestName) {
            bestName.textContent = "Sin datos";
        }
        if (bestQuantity) {
            bestQuantity.textContent = "0";
        }
        if (bestTotal) {
            bestTotal.textContent = formatearMoneda(0);
        }
        if (bestShare) {
            bestShare.textContent = "0%";
        }
        if (bestImage) {
            bestImage.hidden = true;
        }
        return;
    }
    const nombre = productoMasVendido.nombre || `Producto ${productoMasVendido.id_producto}`;
    const cantidad = Number(productoMasVendido.cantidad_vendida) || 0;
    const total = Number(productoMasVendido.total_vendido) || 0;
    const totalUnidades = ventasDiarias.reduce(
        (suma, venta) => {
            if (!Array.isArray(venta.detalles)) {
                return suma;
            }
            return (suma + venta.detalles.reduce(
                (subtotal, detalle) => subtotal + (Number(detalle.cantidad) || 0), 0));
        }, 0);
    const porcentaje = totalUnidades > 0 ? (cantidad / totalUnidades) * 100 : 0;
    if (bestName) {
        bestName.textContent = nombre;
    }
    if (bestQuantity) {
        bestQuantity.textContent = cantidad.toLocaleString("es-NI");
    }
    if (bestTotal) {
        bestTotal.textContent = formatearMoneda(total);
    }
    if (bestShare) {
        bestShare.textContent = `${porcentaje.toFixed(1)}%`;
    }
    /*
     * El endpoint actual no devuelve foto del producto,
     * por lo que mantenemos oculta la imagen.
     */
    if (bestImage) {
        bestImage.hidden = true;
    }
}
// ============================================================
// TABLA TABULATOR
// ============================================================
function inicializarTabla() {
    const tabla = document.getElementById("tablaVentas");
    if (!tabla) {
        console.error("No se encontró #tablaVentas.");
        return;
    }
    tablaVentas = new Tabulator("#tablaVentas", {
        layout: "fitColumns",
        placeholder: "No hay ventas registradas hoy.",
        pagination: true,
        paginationSize: 10,
        paginationSizeSelector: [
            10,
            20,
            50
        ],
        columns: [{
            title: "N.º venta",
            field: "id",
            width: 100,
            hozAlign: "center"
        }, {
            title: "Fecha",
            field: "fechaFormateada",
            width: 120,
            hozAlign: "center"
        }, {
            title: "Productos",
            field: "productos",
            minWidth: 250,
            widthGrow: 3,
            formatter: "textarea",
            variableHeight: true
        }, {
            title: "Total",
            field: "total",
            width: 130,
            hozAlign: "right",
            formatter: function (cell) {
                return formatearMoneda(cell.getValue());
            }
        }, {
            title: "Estado",
            field: "estado",
            width: 130,
            hozAlign: "center",
            formatter: function (cell) {
                const estado = cell.getValue() || "Completada";
                return `
                            <span class="estado-venta">
                                ${escaparHTML(estado)}
                            </span>
                        `;
            }
        }]
    });
}
// ============================================================
// ACTUALIZAR TABLA
// ============================================================
function actualizarTabla(ventas) {
    if (!tablaVentas) {
        return;
    }
    tablaVentas.setData(ventas);
}
// ============================================================
// GRÁFICO SEMANAL
// ============================================================
function crearGraficoSemanal(datos) {
    const canvas = document.getElementById("weeklyChart");
    const leyenda = document.getElementById("weekly-legend");
    if (!canvas) {
        console.error("No se encontró #weeklyChart.");
        return;
    }
    const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const ventasPorDia = {
        Lunes: 0,
        Martes: 0,
        Miércoles: 0,
        Jueves: 0,
        Viernes: 0,
        Sábado: 0,
        Domingo: 0
    };
    /*
     * PostgreSQL ya devuelve una fila por fecha.
     * Aquí solamente acomodamos los resultados
     * para conservar el diseño actual del gráfico.
     */
    datos.forEach(item => {
        if (!item.fecha) {
            return;
        }
        const fecha = new Date(`${item.fecha}T00:00:00`);
        if (Number.isNaN(fecha.getTime())) {
            return;
        }
        const numeroDia = fecha.getDay();
        const nombreDia = numeroDia === 0 ? "Domingo" : dias[numeroDia - 1];
        ventasPorDia[nombreDia] += Number(item.total_ventas) || 0;
    });
    const valores = dias.map(dia => ventasPorDia[dia]);
    if (graficoSemanal) {
        graficoSemanal.destroy();
        graficoSemanal = null;
    }
    graficoSemanal = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: dias,
            datasets: [{
                data: valores,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "58%",
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const valor = Number(context.raw || 0);
                            return (context.label + ": " + formatearMoneda(valor));
                        }
                    }
                }
            }
        }
    });
    if (!leyenda) {
        return;
    }
    const total = valores.reduce(
        (suma, valor) => suma + valor, 0);
    leyenda.innerHTML = dias.map(
        (dia, indice) => {
            const valor = valores[indice];
            const porcentaje = total > 0 ? (valor / total) * 100 : 0;
            return `
                    <div class="weekly-legend-item">

                        <span class="weekly-legend-name">
                            ${dia}
                        </span>

                        <span class="weekly-legend-value">
                            ${formatearMoneda(valor)}

                            <small>
                                ${porcentaje.toFixed(1)}%
                            </small>
                        </span>

                    </div>
                `;
        }).join("");
}
// ============================================================
// GRÁFICO MENSUAL
// ============================================================
function crearGraficoMensual(datos) {
    const canvas = document.getElementById("monthlyChart");
    if (!canvas) {
        console.error("No se encontró #monthlyChart.");
        return;
    }
    const etiquetas = datos.map(item => {
        const fecha = new Date(`${item.mes}T00:00:00`);
        if (Number.isNaN(fecha.getTime())) {
            return item.mes;
        }
        return fecha.toLocaleDateString("es-NI", {
            month: "short",
            year: "numeric"
        });
    });
    const valores = datos.map(item => Number(item.total_ventas) || 0);
    if (graficoMensual) {
        graficoMensual.destroy();
        graficoMensual = null;
    }
    graficoMensual = new Chart(canvas, {
        type: "bar",
        data: {
            labels: etiquetas,
            datasets: [{
                label: "Ventas",
                data: valores,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (valor) {
                            return (MONEDA + " " + Number(valor).toLocaleString("es-NI"));
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            return ("Ventas: " + formatearMoneda(context.raw));
                        }
                    }
                }
            }
        }
    });
}
// ============================================================
// EXPORTAR CSV
// ============================================================
function exportarCSV() {
    if (!ventasDiarias.length) {
        mostrarMensaje("No hay ventas de hoy para exportar.", "error");
        return;
    }
    const filas = [
        ["Numero de venta", "Fecha", "Productos", "Total", "Estado"], ...ventasDiarias.map(venta => [
            venta.id,
            venta.fecha,
            venta.productos,
            Number(venta.total || 0).toFixed(2),
            venta.estado
        ])
    ];
    const contenido = filas.map(fila => fila.map(valor => `"${String(
        valor
    ).replace(
        /"/g,
        '""'
    )}"`).join(";")).join("\r\n");
    const archivo = new Blob(
        ["\uFEFF" + contenido], {
        type: "text/csv;charset=utf-8;"
    });
    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "reporte_ventas_diarias.csv";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    URL.revokeObjectURL(url);
}
// ============================================================
// FECHA DE GENERACIÓN
// ============================================================
function actualizarFechaGeneracion() {
    if (!generatedDate) {
        return;
    }
    const ahora = new Date();
    generatedDate.textContent = ahora.toLocaleDateString("es-NI", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}
// ============================================================
// CONFIGURAR FECHAS
// ============================================================
function configurarFechas() {
    const hoy = obtenerFechaActual();
    /*
     * La tabla diaria siempre corresponde
     * al día actual.
     *
     * Los campos de fecha se mantienen solamente
     * para no romper el HTML existente.
     */
    if (fechaInicio) {
        fechaInicio.value = hoy;
        fechaInicio.max = hoy;
    }
    if (fechaFin) {
        fechaFin.value = hoy;
        fechaFin.max = hoy;
    }
}
// ============================================================
// EVENTOS
// ============================================================
document.addEventListener("DOMContentLoaded",
    () => {
        // ========================================
        // OBTENER ELEMENTOS HTML
        // ========================================
        mensaje = document.getElementById("mensaje");
        fechaInicio = document.getElementById("date-from");
        fechaFin = document.getElementById("date-to");
        kpiTotal = document.getElementById("kpi-total");
        kpiCount = document.getElementById("kpi-count");
        kpiDiscounts = document.getElementById("kpi-discounts");
        bestShare = document.getElementById("best-share");
        bestImage = document.getElementById("best-image");
        bestName = document.getElementById("best-name");
        bestQuantity = document.getElementById("best-quantity");
        bestTotal = document.getElementById("best-total");
        generatedDate = document.getElementById("generated-date");
        // ========================================
        // FECHAS
        // ========================================
        configurarFechas();
        // ========================================
        // FECHA DE GENERACIÓN
        // ========================================
        actualizarFechaGeneracion();
        // ========================================
        // INICIALIZAR TABLA
        // ========================================
        inicializarTabla();
        // ========================================
        // BOTÓN ACTUALIZAR
        // ========================================
        const botonActualizar = document.getElementById("apply-filters");
        if (botonActualizar) {
            botonActualizar.addEventListener("click", async () => {
                await cargarReporte();
            });
        }
        // ========================================
        // BOTÓN EXPORTAR CSV
        // ========================================
        const botonCSV = document.getElementById("export-csv");
        if (botonCSV) {
            botonCSV.addEventListener("click", exportarCSV);
        }
        /*
         * Algunos HTML pueden tener un botón
         * con otro ID para la exportación.
         *
         * Lo conservamos como compatibilidad.
         */
        const botonCSVAlternativo = document.getElementById("save-csv");
        if (botonCSVAlternativo && botonCSVAlternativo !== botonCSV) {
            botonCSVAlternativo.addEventListener("click", exportarCSV);
        }
        // ========================================
        // BOTÓN PDF
        // ========================================
        const botonPDF = document.getElementById("save-pdf");
        if (botonPDF) {
            botonPDF.addEventListener("click",
                () => {
                    mostrarMensaje("La generación del PDF todavía no está configurada.", "error");
                });
        }
        // ========================================
        // CARGAR REPORTE
        // ========================================
        cargarReporte();
    });
