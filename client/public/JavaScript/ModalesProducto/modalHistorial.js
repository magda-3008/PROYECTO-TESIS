async function abrirHistorial(producto) {
  // --------------------------------------------------
  // INFORMACIÓN DEL PRODUCTO
  // --------------------------------------------------
  document.getElementById("nombreProductoHistorial").textContent = producto.nombre;
  document.getElementById("tipoProductoHistorial").textContent = producto.tipo;
  document.getElementById("stockActualHistorial").textContent = producto.stock_actual || 0;
  // --------------------------------------------------
  // ELEMENTOS DEL MODAL
  // --------------------------------------------------
  const cargando = document.getElementById("cargandoHistorial");
  const tbody = document.getElementById("tablaMovimientos");
  const selectorPeriodo = document.getElementById("periodoHistorial");
  // --------------------------------------------------
  // PREPARAR MODAL
  // --------------------------------------------------
  cargando.classList.remove("d-none");
  tbody.innerHTML = "";
  selectorPeriodo.innerHTML = "";
  selectorPeriodo.disabled = true;
  try {
    // --------------------------------------------------
    // OBTENER PERÍODOS DISPONIBLES
    // --------------------------------------------------
    const respuestaPeriodos = await fetch(`/api/historial/periodos/${producto.id_producto}`);
    if (!respuestaPeriodos.ok) {
      const errorData = await respuestaPeriodos.json();
      throw new Error(errorData.mensaje || "No se pudieron cargar los períodos.");
    }
    const periodos = await respuestaPeriodos.json();
    // --------------------------------------------------
    // NO HAY PERÍODOS
    // --------------------------------------------------
    if (!periodos || periodos.length === 0) {
      selectorPeriodo.innerHTML = `
                <option value="">
                    Sin períodos
                </option>
            `;
      selectorPeriodo.disabled = true;
      cargando.classList.add("d-none");
      tbody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="text-center text-muted py-4">

                        <i
                            class="bi bi-clock-history fs-4 d-block mb-2">
                        </i>

                        No hay movimientos registrados
                        para este producto.

                    </td>
                </tr>
            `;
    } else {
      // --------------------------------------------------
      // LLENAR SELECTOR DE PERÍODOS
      // --------------------------------------------------
      periodos.forEach((periodo) => {
        const option = document.createElement("option");
        option.value = `${periodo.anio}-${periodo.mes}`;
        option.textContent = formatearPeriodo(periodo.anio, periodo.mes);
        option.dataset.anio = periodo.anio;
        option.dataset.mes = periodo.mes;
        selectorPeriodo.appendChild(option);
      });
      // El backend devuelve los períodos
      // ordenados del más reciente al más antiguo.
      // Por eso seleccionamos el primero.
      selectorPeriodo.selectedIndex = 0;
      selectorPeriodo.disabled = false;
      // --------------------------------------------------
      // CARGAR EL PERÍODO SELECCIONADO
      // --------------------------------------------------
      await cargarMovimientosProducto(producto.id_producto, selectorPeriodo.value);
    }
  } catch (error) {
    console.error("Error al cargar historial:", error);
    cargando.classList.add("d-none");
    tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="text-center text-danger">

                    Error al cargar el historial:
                    ${error.message}

                </td>
            </tr>
        `;
  }
  // --------------------------------------------------
  // CAMBIO DE PERÍODO
  // --------------------------------------------------
  selectorPeriodo.onchange = async function () {
    if (!this.value) {
      return;
    }
    await cargarMovimientosProducto(producto.id_producto, this.value);
  };
  // --------------------------------------------------
  // ABRIR MODAL
  // --------------------------------------------------
  const modal = new bootstrap.Modal(document.getElementById("modalHistorial"));
  modal.show();
}
// ======================================================
// CARGAR MOVIMIENTOS DEL PERÍODO
// ======================================================
async function cargarMovimientosProducto(idProducto, periodo) {
  const cargando = document.getElementById("cargandoHistorial");
  const tbody = document.getElementById("tablaMovimientos");
  // --------------------------------------------------
  // VALIDAR PERÍODO
  // --------------------------------------------------
  if (!periodo) {
    return;
  }
  const partes = periodo.split("-");
  const anio = partes[0];
  const mes = partes[1];
  // --------------------------------------------------
  // MOSTRAR CARGANDO
  // --------------------------------------------------
  cargando.classList.remove("d-none");
  tbody.innerHTML = "";
  try {
    // --------------------------------------------------
    // CONSULTAR MOVIMIENTOS
    // --------------------------------------------------
    const respuesta = await fetch(`/api/historial/${idProducto}?anio=${anio}&mes=${mes}`);
    if (!respuesta.ok) {
      const errorData = await respuesta.json();
      throw new Error(errorData.mensaje || "Error al cargar el historial.");
    }
    const movimientos = await respuesta.json();
    cargando.classList.add("d-none");
    // --------------------------------------------------
    // SIN MOVIMIENTOS
    // --------------------------------------------------
    if (!movimientos || movimientos.length === 0) {
      tbody.innerHTML = `
                <tr>
                    <td
                        colspan="5"
                        class="text-center text-muted py-4">

                        <i
                            class="bi bi-clock-history fs-4 d-block mb-2">
                        </i>

                        No hay movimientos registrados
                        para este período.

                    </td>
                </tr>
            `;
      return;
    }
    // --------------------------------------------------
    // MOSTRAR MOVIMIENTOS
    // --------------------------------------------------
    movimientos.forEach((mov) => {
      // --------------------------------------------------
      // FECHA
      // --------------------------------------------------
      let fecha = "Sin fecha";
      if (mov.fecha) {
        const date = new Date(mov.fecha);
        fecha = date.toLocaleDateString("es-ES", {
          year: "numeric",
          month: "short",
          day: "numeric"
        });
      }
      // --------------------------------------------------
      // VARIABLES
      // --------------------------------------------------
      let tipoBadge = "";
      let cantidadMostrar = "";
      let montoTexto = "—";
      const cantidad = Number(mov.cantidad) || 0;
      const costoTotal = Number(mov.costo_total) || 0;
      // --------------------------------------------------
      // ENTRADAS
      // --------------------------------------------------
      if (mov.tipo_movimiento === "ENTRADA") {
        let motivoTexto = "";
        switch (mov.motivo) {
          case "COMPRA":
            motivoTexto = "Compra";
            break;
          case "PRODUCCION":
            motivoTexto = "Producción";
            break;
          case "AJUSTE":
            motivoTexto = "Ajuste";
            break;
          case "OTRO":
            motivoTexto = "Otro";
            break;
          default:
            motivoTexto = mov.motivo || "Entrada";
        }
        tipoBadge = `
                    <span class="badge bg-success">
                        Entrada · ${motivoTexto}
                    </span>
                `;
        cantidadMostrar = `
                    <span class="text-success">
                        +${cantidad}
                    </span>
                `;
        // --------------------------------------------------
        // VALOR DE LA ENTRADA
        // --------------------------------------------------
        if (mov.motivo === "COMPRA") {
          montoTexto = `
                        <div>

                            <span
                                class="text-success font-monospace">

                                ${formatoMoneda(
            costoTotal
          )}

                            </span>

                            <small
                                class="d-block text-muted">

                                Costo de compra

                            </small>

                        </div>
                    `;
        } else if (mov.motivo === "PRODUCCION") {
          montoTexto = `
                        <div>

                            <span
                                class="text-success font-monospace">

                                ${formatoMoneda(
            costoTotal
          )}

                            </span>

                            <small
                                class="d-block text-muted">

                                Costo de producción

                            </small>

                        </div>
                    `;
        } else if (mov.motivo === "AJUSTE") {
          montoTexto = "—";
        } else if (mov.motivo === "OTRO") {
          montoTexto = "—";
        }
      }
      // --------------------------------------------------
      // SALIDAS
      // --------------------------------------------------
      else if (mov.tipo_movimiento === "SALIDA") {
        let motivoTexto = "";
        switch (mov.motivo) {
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
          case "VENTA":
            motivoTexto = "Venta";
            break;
          default:
            motivoTexto = mov.motivo || "Salida";
        }
        tipoBadge = `
                    <span class="badge bg-danger">
                        Salida · ${motivoTexto}
                    </span>
                `;
        cantidadMostrar = `
                    <span class="text-danger">
                        -${cantidad}
                    </span>
                `;
        // --------------------------------------------------
        // VALOR DE LA SALIDA
        // --------------------------------------------------
        if (mov.motivo === "PERDIDA") {
          montoTexto = `
                        <div>

                            <span
                                class="text-danger font-monospace">

                                ${formatoMoneda(
            costoTotal
          )}

                            </span>

                            <small
                                class="d-block text-muted">

                                Valor de la pérdida

                            </small>

                        </div>
                    `;
        } else if (mov.motivo === "AJUSTE") {
          montoTexto = "—";
        } else if (mov.motivo === "OTRO") {
          montoTexto = "—";
        } else if (mov.motivo === "VENTA") {
          montoTexto = "—";
        } else if (mov.motivo === "CONSUMO") {
          montoTexto = `
                        <div>

                            <span
                                class="text-danger font-monospace">

                                ${formatoMoneda(
            costoTotal
          )}

                            </span>

                            <small
                                class="d-block text-muted">

                                Costo de consumo

                            </small>

                        </div>
                    `;
        }
      }
      // --------------------------------------------------
      // TIPO DESCONOCIDO
      // --------------------------------------------------
      else {
        tipoBadge = `
                    <span class="badge bg-secondary">
                        ${mov.tipo_movimiento ||
          "Desconocido"}
                    </span>
                `;
        cantidadMostrar = cantidad;
        montoTexto = "—";
      }
      // --------------------------------------------------
      // CREAR FILA
      // --------------------------------------------------
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
                    class="text-center text-danger">

                    Error al cargar el historial:
                    ${error.message}

                </td>
            </tr>
        `;
  }
}
// ======================================================
// FORMATEAR PERÍODO
// ======================================================
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
