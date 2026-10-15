"use strict";
const API_URL = "/api/ventas";
const MONEDA = "C$";
let ventasDiarias = [];
let datosSemanales = [];
let datosMensuales = [];
let productoMasVendido = null;
let tablaVentas = null;
let graficoSemanal = null;
let graficoMensual = null;
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

function formatearMoneda(valor) {
    const numero = Number(valor) || 0;
    return (MONEDA + " " + numero.toLocaleString("es-NI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }));
}

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
        throw new Error("La fecha desde no puede ser posterior a la fecha hasta.");
    }
    return {
        desde,
        hasta
    };
}

function escaparHTML(texto) {
    return String(texto ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caracter]);
}
async function obtenerDatos(endpoint) {
    const respuesta = await fetch(`${API_URL}${endpoint}`);
    let datos = null;
    try {
        datos = await respuesta.json();
    } catch {
        throw new Error("Verifica tu conexión o intenta de nuevo más tarde");
    }
    if (!respuesta.ok) {
        throw new Error(datos?.mensaje || `Error del servidor (${respuesta.status}).`);
    }
    return datos;
}

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
        detalles
    };
}
async function cargarVentasDiarias(desde, hasta) {
    try {
        const datos = await obtenerDatos(`/diarias?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
        ventasDiarias = Array.isArray(datos) ? datos.map(normalizarVenta) : [];
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
async function cargarDatosSemanales(desde, hasta) {
    try {
        const datos = await obtenerDatos(`/semanales?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
        datosSemanales = Array.isArray(datos) ? datos : [];
        crearGraficoSemanal(datosSemanales);
        return datosSemanales;
    } catch (error) {
        console.error("Error al cargar resumen por día:", error);
        datosSemanales = [];
        crearGraficoSemanal([]);
        throw error;
    }
}
async function cargarDatosMensuales(desde, hasta) {
    try {
        const datos = await obtenerDatos(`/mensuales?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
        datosMensuales = Array.isArray(datos) ? datos : [];
        crearGraficoMensual(datosMensuales);
        return datosMensuales;
    } catch (error) {
        console.error("Error al cargar resumen mensual:", error);
        datosMensuales = [];
        crearGraficoMensual([]);
        throw error;
    }
}
async function cargarProductoMasVendido(desde, hasta) {
    try {
        const datos = await obtenerDatos(`/producto-mas-vendido?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`);
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
async function cargarReporte() {
    const boton = document.getElementById("apply-filters");
    if (boton) {
        boton.disabled = true;
    }
    mostrarMensaje("Cargando reporte...");
    try {
        const {
            desde,
            hasta
        } = obtenerRangoFechas();
        await Promise.all([
            cargarVentasDiarias(desde, hasta),
            cargarDatosSemanales(desde, hasta),
            cargarDatosMensuales(desde, hasta),
            cargarProductoMasVendido(desde, hasta)
        ]);
        actualizarFechaGeneracion();
        mostrarMensaje("Reporte cargado correctamente.", "exito");
    } catch (error) {
        console.error("Error al cargar el reporte:", error);
        mostrarMensaje("No se pudo cargar el reporte. " + error.message, "error");
    } finally {
        if (boton) {
            boton.disabled = false;
        }
    }
}

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
            return suma + venta.detalles.reduce(
                (subtotal, detalle) => subtotal + (Number(detalle.cantidad) || 0), 0);
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
    // Mostrar imagen del producto más vendido
    if (bestImage) {
        if (productoMasVendido.foto_producto) {
            bestImage.src = productoMasVendido.foto_producto;
            bestImage.hidden = false;
        } else {
            bestImage.hidden = true;
        }
    }
}

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
        paginationSize: 9,
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
        }]
    });
}

function actualizarTabla(ventas) {
    if (!tablaVentas) {
        return;
    }
    tablaVentas.setData(ventas);
}

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
    datos.forEach(item => {
        if (!item.fecha) return;
        const coincidencia = String(item.fecha).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!coincidencia) {
            return;
        }
        const anio = Number(coincidencia[1]);
        const mes = Number(coincidencia[2]);
        const dia = Number(coincidencia[3]);
        const numeroDia = new Date(anio, mes - 1, dia).getDay();
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
                borderWidth: 2,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "58%",
            layout: {
                padding: {
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10
                }
            },
            animation: {
                duration: 700
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    displayColors: true,
                    padding: 10,
                    callbacks: {
                        label: context => {
                            return (context.label + ": " + formatearMoneda(Number(context.raw || 0)));
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
    leyenda.innerHTML = dias.map((dia, indice) => {
        const valor = valores[indice];
        const porcentaje = total > 0 ? (valor / total) * 100 : 0;
        return `
                <div class="weekly-legend-item">

                    <div class="weekly-legend-left">

                        <span class="weekly-legend-indicator"></span>

                        <span class="weekly-legend-name">
                            ${dia}
                        </span>

                    </div>

                    <div class="weekly-legend-right">

                        <span class="weekly-legend-value">
                            ${formatearMoneda(valor)}
                        </span>

                        <span class="weekly-legend-percentage">
                            ${porcentaje.toFixed(1)}%
                        </span>

                    </div>

                </div>
            `;
    }).join("");
}

function crearGraficoMensual(datos) {
    const canvas = document.getElementById("monthlyChart");
    if (!canvas) {
        console.error("No se encontró #monthlyChart.");
        return;
    }
    const etiquetas = datos.map(item => {
        if (!item.mes) {
            return "Sin fecha";
        }
        const coincidencia = String(item.mes).match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!coincidencia) {
            return String(item.mes);
        }
        const anio = Number(coincidencia[1]);
        const mes = Number(coincidencia[2]);
        const fecha = new Date(anio, mes - 1, 1);
        return fecha.toLocaleDateString("es-NI", {
            month: "long",
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
                        callback: valor => MONEDA + " " + Number(valor).toLocaleString("es-NI")
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: context => "Ventas: " + formatearMoneda(context.raw)
                    }
                }
            }
        }
    });
}

function exportarPDF() {
    if (!ventasDiarias.length) {
        mostrarMensaje("No hay ventas en el período seleccionado para exportar.", "error");
        return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
        mostrarMensaje("No se pudo cargar el generador de PDF.", "error");
        console.error("jsPDF no está disponible.");
        return;
    }
    try {
        const {
            jsPDF
        } = window.jspdf;
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });
        const {
            desde,
            hasta
        } = obtenerRangoFechas();
        const fechaGeneracion = new Date().toLocaleDateString("es-NI", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
        const totalVentas = ventasDiarias.reduce(
            (suma, venta) => suma + Number(venta.total || 0), 0);
        const cantidadVentas = ventasDiarias.length;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("Pa'TuBoca Delicias y Más", 14, 18);
        doc.setFontSize(14);
        doc.text("Reporte de ventas", 14, 27);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(`Período: ${formatearFecha(desde)} - ${formatearFecha(hasta)}`, 14, 36);
        doc.text(`Fecha de generación: ${fechaGeneracion}`, 14, 42);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(`Cantidad de ventas: ${cantidadVentas}`, 200, 36);
        doc.text(`Total vendido: ${formatearMoneda(totalVentas)}`, 200, 42);
        const filas = ventasDiarias.map(venta => {
            return [
                venta.id,
                venta.fechaFormateada,
                venta.productos,
                formatearMoneda(venta.total),
            ];
        });
        doc.autoTable({
            startY: 50,
            head: [
                ["N.º venta", "Fecha", "Productos", "Total"]
            ],
            body: filas,
            theme: "grid",
            styles: {
                font: "helvetica",
                fontSize: 9,
                cellPadding: 3,
                valign: "middle"
            },
            headStyles: {
                fontStyle: "bold",
                halign: "center"
            },
            columnStyles: {
                0: {
                    halign: "center",
                    cellWidth: 25
                },
                1: {
                    halign: "center",
                    cellWidth: 30
                },
                2: {
                    cellWidth: 150
                },
                3: {
                    halign: "right",
                    cellWidth: 35
                },
                4: {
                    halign: "center",
                    cellWidth: 30
                }
            },
            margin: {
                left: 14,
                right: 14
            }
        });
        const posicionFinal = doc.lastAutoTable.finalY + 10;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`Total de ventas: ${formatearMoneda(totalVentas)}`, 14, posicionFinal);
        const paginas = doc.internal.getNumberOfPages();
        for (let pagina = 1; pagina <= paginas; pagina++) {
            doc.setPage(pagina);
            const alturaPagina = doc.internal.pageSize.getHeight();
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(`Pa'TuBoca Delicias y Más - Reporte de ventas`, 14, alturaPagina - 8);
            doc.text(`Página ${pagina} de ${paginas}`, 280, alturaPagina - 8, {
                align: "right"
            });
        }
        const nombreArchivo = `reporte_ventas_${desde}_${hasta}.pdf`;
        doc.save(nombreArchivo);
        mostrarMensaje("Reporte PDF generado correctamente.", "exito");
    } catch (error) {
        console.error("Error al generar el PDF:", error);
        mostrarMensaje("No se pudo generar el reporte PDF.", "error");
    }
}

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

function configurarFechas() {
    const hoy = obtenerFechaActual();
    if (fechaInicio) {
        fechaInicio.value = hoy;
        fechaInicio.max = hoy;
    }
    if (fechaFin) {
        fechaFin.value = hoy;
        fechaFin.max = hoy;
    }
}
document.addEventListener("DOMContentLoaded",
    () => {
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
        configurarFechas();
        actualizarFechaGeneracion();
        inicializarTabla();
        const botonActualizar = document.getElementById("apply-filters");
        if (botonActualizar) {
            botonActualizar.addEventListener("click", async () => {
                await cargarReporte();
            });
        }
        const botonPDF = document.getElementById("save-pdf");
        if (botonPDF) {
            botonPDF.addEventListener("click", exportarPDF);
        }
        cargarReporte();
    });
