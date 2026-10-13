
"use strict";


const API_URL = "http://localhost:3000/api/ventasRoutes";

const MONEDA = "C$";

// Datos recibidos desde el servidor
let todasLasVentas = [];
let tablaVentas = null;
let graficoVentas = null;
let graficoProductos = null;

// ============================================
// ELEMENTOS HTML
// ============================================

const mensaje = document.getElementById("mensaje");
const fechaInicio = document.getElementById("fechaInicio");
const fechaFin = document.getElementById("fechaFin");
const estadoFiltro = document.getElementById("estadoFiltro");

const totalIngresos = document.getElementById("totalIngresos");
const cantidadVentas = document.getElementById("cantidadVentas");
const ticketPromedio = document.getElementById("ticketPromedio");

// ============================================
// FUNCIONES GENERALES
// ============================================

function mostrarMensaje(texto, tipo = "") {
    mensaje.textContent = texto;
    mensaje.className = "mensaje";

    if (tipo) {
        mensaje.classList.add(tipo);
    }
}

function formatearMoneda(valor) {
    const numero = Number(valor) || 0;

    return MONEDA + " " + numero.toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function obtenerPrimero(objeto, propiedades, valorPorDefecto = "") {
    for (const propiedad of propiedades) {
        if (objeto[propiedad] !== undefined &&
            objeto[propiedad] !== null) {
            return objeto[propiedad];
        }
    }

    return valorPorDefecto;
}

function normalizarEstado(estado) {
    const valor = String(estado || "Sin estado")
        .trim()
        .toLowerCase();

    if (["completada", "completado", "pagada", "pagado",
        "finalizada", "finalizado"].includes(valor)) {
        return "completada";
    }

    if (["pendiente", "en proceso"].includes(valor)) {
        return "pendiente";
    }

    if (["anulada", "anulado", "cancelada", "cancelado"].includes(valor)) {
        return "anulada";
    }

    return valor || "sin estado";
}

function formatearFecha(fecha) {
    if (!fecha) {
        return "Sin fecha";
    }

    // Evita interpretar una fecha SQL YYYY-MM-DD
    // como el día anterior debido a la zona horaria.
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

function obtenerClaveFecha(fecha) {
    if (!fecha) return "";

    const coincidencia = String(fecha).match(/^(\d{4}-\d{2}-\d{2})/);

    if (coincidencia) {
        return coincidencia[1];
    }

    const fechaConvertida = new Date(fecha);

    if (Number.isNaN(fechaConvertida.getTime())) {
        return "";
    }

    const anio = fechaConvertida.getFullYear();
    const mes = String(fechaConvertida.getMonth() + 1).padStart(2, "0");
    const dia = String(fechaConvertida.getDate()).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

// ============================================
// ADAPTAR LOS DATOS DE LA API
// ============================================

// Esta función admite varios nombres habituales de campos.
// Debes verificar que coincidan con los que devuelve tu API.

function normalizarVenta(venta, indice) {
    const detalles = obtenerPrimero(
        venta,
        ["detalles", "productos", "detalle_venta", "items"],
        []
    );

    let nombresProductos = "";

    if (Array.isArray(detalles)) {
        nombresProductos = detalles
            .map(item => {
                if (typeof item === "string") return item;

                return obtenerPrimero(
                    item,
                    ["nombre_producto", "nombre", "producto"],
                    ""
                );
            })
            .filter(Boolean)
            .join(", ");
    } else if (typeof detalles === "string") {
        nombresProductos = detalles;
    }

    const fecha = obtenerPrimero(
        venta,
        ["fecha_venta", "fecha", "created_at", "fecha_registro"],
        ""
    );

    const id = obtenerPrimero(
        venta,
        ["id_venta", "idVenta", "id", "numero_venta"],
        indice + 1
    );

    const total = Number(obtenerPrimero(
        venta,
        ["total_venta", "total", "monto_total", "total_pagar"],
        0
    ));

    const estado = normalizarEstado(obtenerPrimero(
        venta,
        ["estado", "estado_venta", "estatus"],
        "Sin estado"
    ));

    // Si la API no devuelve productos, mostrar un texto neutral.
    if (!nombresProductos) {
        nombresProductos = "Detalle no disponible";
    }

    return {
        id: String(id),
        fecha: fecha,
        fechaClave: obtenerClaveFecha(fecha),
        productos: nombresProductos,
        total: Number.isFinite(total) ? total : 0,
        estado: estado,
        detalles: Array.isArray(detalles) ? detalles : []
    };
}

// ============================================
// CARGAR VENTAS DESDE EL BACKEND
// ============================================

async function cargarVentas() {
    const boton = document.getElementById("btnActualizar");

    boton.disabled = true;
    mostrarMensaje("Cargando ventas desde el servidor...");

    try {
        const respuesta = await fetch(API_URL, {
            method: "GET",
            headers: {
                "Accept": "application/json"
            }
        });

        if (!respuesta.ok) {
            throw new Error(
                `El servidor respondió con el estado ${respuesta.status}.`
            );
        }

        const resultado = await respuesta.json();

        // Admite una respuesta como [] o como { ventas: [] }.
        const lista = Array.isArray(resultado)
            ? resultado
            : resultado.ventas ??
            resultado.data ??
            resultado.resultados;

        if (!Array.isArray(lista)) {
            throw new Error(
                "La API no devolvió una lista de ventas. " +
                "Revisa el formato de la respuesta."
            );
        }

        todasLasVentas = lista.map(normalizarVenta);

        actualizarReporte();

        mostrarMensaje(
            `Datos cargados correctamente: ${todasLasVentas.length} ventas.`,
            "exito"
        );

    } catch (error) {
        console.error("Error al cargar las ventas:", error);

        mostrarMensaje(
            "No se pudieron cargar las ventas. Verifica que el servidor " +
            "esté activo, que la ruta de la API sea correcta y que " +
            "la respuesta contenga una lista de ventas. Detalle: " +
            error.message,
            "error"
        );

    } finally {
        boton.disabled = false;
    }
}

// ============================================
// FILTROS
// ============================================

function obtenerVentasFiltradas() {
    const desde = fechaInicio.value;
    const hasta = fechaFin.value;
    const estado = estadoFiltro.value.toLowerCase();

    return todasLasVentas.filter(venta => {
        if (desde && venta.fechaClave && venta.fechaClave < desde) {
            return false;
        }

        if (hasta && venta.fechaClave && venta.fechaClave > hasta) {
            return false;
        }

        if (estado && venta.estado !== estado) {
            return false;
        }

        return true;
    });
}

// ============================================
// ACTUALIZAR RESUMEN Y TABLA
// ============================================

function actualizarReporte() {
    const ventasFiltradas = obtenerVentasFiltradas();

    // Las ventas anuladas no se cuentan como ingresos.
    const ventasValidas = ventasFiltradas.filter(
        venta => venta.estado !== "anulada"
    );

    const ingresos = ventasValidas.reduce(
        (suma, venta) => suma + venta.total,
        0
    );

    const promedio = ventasValidas.length
        ? ingresos / ventasValidas.length
        : 0;

    totalIngresos.textContent = formatearMoneda(ingresos);
    cantidadVentas.textContent = ventasFiltradas.length.toLocaleString("es-NI");
    ticketPromedio.textContent = formatearMoneda(promedio);

    actualizarTabla(ventasFiltradas);
    actualizarGraficos(ventasValidas);
}

// ============================================
// TABLA CON DATATABLES
// ============================================

function inicializarTabla() {
    tablaVentas = new DataTable("#tablaVentas", {
        data: [],

        columns: [
            {
                data: "id",
                render: DataTable.render.text()
            },
            {
                data: "fecha",
                render: function (valor, tipo, fila) {
                    if (tipo === "sort" || tipo === "type") {
                        return fila.fechaClave || "";
                    }

                    return formatearFecha(valor);
                }
            },
            {
                data: "productos",
                render: DataTable.render.text()
            },
            {
                data: "total",
                render: function (valor, tipo) {
                    if (tipo === "sort" || tipo === "type") {
                        return Number(valor) || 0;
                    }

                    return formatearMoneda(valor);
                }
            },
            {
                data: "estado",
                render: function (valor, tipo) {
                    if (tipo !== "display") {
                        return valor;
                    }

                    let clase = "estado-otro";

                    if (valor === "completada") {
                        clase = "estado-completada";
                    } else if (valor === "pendiente") {
                        clase = "estado-pendiente";
                    } else if (valor === "anulada") {
                        clase = "estado-anulada";
                    }

                    const texto = valor.charAt(0).toUpperCase() +
                        valor.slice(1);

                    return `<span class="estado ${clase}">${texto}</span>`;
                }
            }
        ],

        pageLength: 10,
        lengthMenu: [5, 10, 25, 50],
        order: [[1, "desc"]],

        language: {
            url: "https://cdn.datatables.net/plug-ins/2.3.4/i18n/es-ES.json"
        },

        responsive: false,
        autoWidth: false
    });
}

function actualizarTabla(ventas) {
    tablaVentas.clear();
    tablaVentas.rows.add(ventas);
    tablaVentas.draw();
}

// ============================================
// GRÁFICO DE VENTAS POR DÍA
// ============================================

function crearGraficoVentas(ventas) {
    const agrupadas = {};

    ventas.forEach(venta => {
        const clave = venta.fechaClave || "Sin fecha";

        agrupadas[clave] = (agrupadas[clave] || 0) + venta.total;
    });

    const fechas = Object.keys(agrupadas)
        .filter(fecha => fecha !== "Sin fecha")
        .sort();

    const etiquetas = fechas.map(fecha => {
        const partes = fecha.split("-");
        return `${partes[2]}/${partes[1]}`;
    });

    const valores = fechas.map(fecha => agrupadas[fecha]);

    if (graficoVentas) {
        graficoVentas.destroy();
    }

    graficoVentas = new Chart(
        document.getElementById("graficoVentas"),
        {
            type: "line",

            data: {
                labels: etiquetas,
                datasets: [{
                    label: "Ingresos",
                    data: valores,
                    borderColor: "#e84a91",
                    backgroundColor: "rgba(232, 74, 145, 0.15)",
                    fill: true,
                    tension: 0.35,
                    borderWidth: 3,
                    pointRadius: 4,
                    pointBackgroundColor: "#bd286d"
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        callbacks: {
                            label: contexto =>
                                formatearMoneda(contexto.parsed.y)
                        }
                    }
                },

                scales: {
                    y: {
                        beginAtZero: true,

                        ticks: {
                            callback: valor =>
                                "C$ " + Number(valor).toLocaleString("es-NI")
                        }
                    }
                }
            }
        }
    );
}



function crearGraficoProductos(ventas) {
    const agrupadas = {};

    ventas.forEach(venta => {
        venta.detalles.forEach(detalle => {
            const nombre = obtenerPrimero(
                detalle,
                ["nombre_producto", "nombre", "producto"],
                ""
            );

            if (!nombre || typeof nombre !== "string") {
                return;
            }

            const subtotal = Number(obtenerPrimero(
                detalle,
                ["subtotal", "subtotal_detalle", "total_detalle"],
                0
            ));

            const cantidad = Number(obtenerPrimero(
                detalle,
                ["cantidad", "cantidad_vendida"],
                1
            ));

            // Se prioriza el subtotal; si no existe, se usa la cantidad.
            const tieneSubtotal = [
                "subtotal", "subtotal_detalle", "total_detalle"
            ].some(campo => detalle[campo] !== undefined &&
                detalle[campo] !== null);

            const valor = tieneSubtotal
                ? (Number.isFinite(subtotal) ? subtotal : 0)
                : (Number.isFinite(cantidad) ? cantidad : 0);

            agrupadas[nombre] = (agrupadas[nombre] || 0) + valor;
        });
    });

    const productos = Object.entries(agrupadas)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7);

    if (graficoProductos) {
        graficoProductos.destroy();
    }

    const colores = [
        "#e84a91",
        "#f59ac3",
        "#b86ad9",
        "#8e83e8",
        "#f4b942",
        "#63b89b",
        "#ef7d68"
    ];

    graficoProductos = new Chart(
        document.getElementById("graficoProductos"),
        {
            type: "doughnut",

            data: {
                labels: productos.length
                    ? productos.map(item => item[0])
                    : ["Sin detalle de productos"],

                datasets: [{
                    data: productos.length
                        ? productos.map(item => item[1])
                        : [1],

                    backgroundColor: colores,
                    borderColor: "#ffffff",
                    borderWidth: 3
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                plugins: {
                    legend: {
                        position: "bottom"
                    },

                    tooltip: {
                        callbacks: {
                            label: contexto => {
                                if (!productos.length) {
                                    return "No hay detalles de productos";
                                }

                                const usaSubtotal = ventas.some(venta =>
                                    venta.detalles.some(detalle =>
                                        detalle.subtotal != null ||
                                        detalle.subtotal_detalle != null ||
                                        detalle.total_detalle != null
                                    )
                                );

                                const valor = Number(contexto.parsed) || 0;

                                return usaSubtotal
                                    ? `${contexto.label}: ${formatearMoneda(valor)}`
                                    : `${contexto.label}: ${valor} unidades`;
                            }
                        }
                    }
                }
            }
        }
    );
}

function actualizarGraficos(ventas) {
    crearGraficoVentas(ventas);
    crearGraficoProductos(ventas);
}

// ============================================
// EXPORTAR TABLA A CSV
// ============================================

function exportarCSV() {
    const ventas = obtenerVentasFiltradas();

    if (!ventas.length) {
        mostrarMensaje("No hay ventas para exportar.", "error");
        return;
    }

    const filas = [
        ["Numero de venta", "Fecha", "Productos", "Total", "Estado"],

        ...ventas.map(venta => [
            venta.id,
            formatearFecha(venta.fecha),
            venta.productos,
            venta.total.toFixed(2),
            venta.estado
        ])
    ];

    // Escapar comillas y separar los campos de forma segura.
    const contenido = filas.map(fila =>
        fila.map(valor =>
            `"${String(valor).replace(/"/g, '""')}"`
        ).join(";")
    ).join("\r\n");

    const archivo = new Blob(
        ["\uFEFF" + contenido],
        { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(archivo);
    const enlace = document.createElement("a");

    enlace.href = url;
    enlace.download = "reporte_ventas.csv";

    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();

    URL.revokeObjectURL(url);
}

// ============================================
// EVENTOS
// ============================================

document.getElementById("btnActualizar")
    .addEventListener("click", cargarVentas);

document.getElementById("btnFiltrar")
    .addEventListener("click", () => {
        if (fechaInicio.value && fechaFin.value &&
            fechaInicio.value > fechaFin.value) {
            mostrarMensaje(
                "La fecha inicial no puede ser posterior a la fecha final.",
                "error"
            );
            return;
        }

        actualizarReporte();
        mostrarMensaje("Filtros aplicados correctamente.", "exito");
    });

document.getElementById("btnLimpiar")
    .addEventListener("click", () => {
        fechaInicio.value = "";
        fechaFin.value = "";
        estadoFiltro.value = "";

        actualizarReporte();
        mostrarMensaje("Se limpiaron los filtros.", "exito");
    });

document.getElementById("btnExportar")
    .addEventListener("click", exportarCSV);

// ============================================
// INICIO
// ============================================

document.addEventListener("DOMContentLoaded", () => {
    inicializarTabla();

    // Crea los gráficos vacíos mientras llegan los datos.
    actualizarGraficos([]);

    cargarVentas();
});
