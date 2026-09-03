async function abrirHistorial(producto) {
  document.getElementById("nombreProductoHistorial").textContent = producto.nombre;
  document.getElementById("tipoProductoHistorial").textContent = producto.tipo;
  document.getElementById("stockActualHistorial").textContent = producto.stock_actual || 0;
  // Mostrar indicador de carga
  const cargando = document.getElementById("cargandoHistorial");
  cargando.classList.remove("d-none");
  // Limpiar tabla anterior
  const tbody = document.getElementById("tablaMovimientos");
  tbody.innerHTML = "";
  try {
    const respuesta = await fetch(`/api/historial/${producto.id_producto}`);
    if (!respuesta.ok) {
      const errorData = await respuesta.json();
      throw new Error(errorData.mensaje || "Error al cargar el historial");
    }
    const movimientos = await respuesta.json();
    // Ocultar indicador de carga
    cargando.classList.add("d-none");
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
                        para este producto.

                    </td>
                </tr>
            `;
    } else {
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
          // VALOR MONETARIO DE LA ENTRADA
          // --------------------------------------------------
          if (mov.motivo === "COMPRA") {
            montoTexto = `
                            <div>
                                <span class="text-success font-monospace">
                                    ${formatoMoneda(costoTotal)}
                                </span>

                                <small class="d-block text-muted">
                                    Costo de compra
                                </small>
                            </div>
                        `;
          } else if (mov.motivo === "PRODUCCION") {
            montoTexto = `
                            <div>
                                <span class="text-success font-monospace">
                                    ${formatoMoneda(costoTotal)}
                                </span>

                                <small class="d-block text-muted">
                                    Costo de producción
                                </small>
                            </div>
                        `;
          } else if (mov.motivo === "AJUSTE") {
            // El ajuste modifica existencias,
            // pero no representa necesariamente
            // dinero gastado o recibido.
            montoTexto = "—";
          } else if (mov.motivo === "OTRO") {
            // "Otro" puede representar situaciones
            // diferentes, por lo que no mostramos
            // un valor monetario para evitar confusión.
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
          // VALOR MONETARIO DE LA SALIDA
          // --------------------------------------------------
          if (mov.motivo === "PERDIDA") {
            montoTexto = `
                            <div>
                                <span class="text-danger font-monospace">
                                    ${formatoMoneda(costoTotal)}
                                </span>

                                <small class="d-block text-muted">
                                    Valor de la pérdida
                                </small>
                            </div>
                        `;
          } else if (mov.motivo === "AJUSTE") {
            // No mostramos monto porque el ajuste
            // representa una corrección de existencias.
            montoTexto = "—";
          } else if (mov.motivo === "OTRO") {
            // El significado económico depende de
            // lo indicado en la observación.
            montoTexto = "—";
          } else if (mov.motivo === "VENTA") {
            // Por ahora no mostramos el monto aquí.
            // Cuando se implemente el módulo de ventas
            // se diferenciará:
            // - ingreso por venta
            // - costo de los productos vendidos
            montoTexto = "—";
          }
        }
        // --------------------------------------------------
        // TIPO DESCONOCIDO
        // --------------------------------------------------
        else {
          tipoBadge = `
                        <span class="badge bg-secondary">
                            ${mov.tipo_movimiento || "Desconocido"}
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
  // ABRIR MODAL
  // --------------------------------------------------
  const modal = new bootstrap.Modal(document.getElementById("modalHistorial"));
  modal.show();
}
