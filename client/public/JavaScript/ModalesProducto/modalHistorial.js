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
  // Ya no se utiliza el período mensual.
  // El historial mostrará los movimientos registrados
  // para este producto.
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
        // TIPO Y MOTIVO
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
          if (mov.costo_total != null && !isNaN(costoTotal)) {
            montoTexto = formatoMoneda(costoTotal);
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
          if (mov.costo_total != null && !isNaN(costoTotal)) {
            montoTexto = `
                            <span class="text-danger font-monospace">
                                ${formatoMoneda(costoTotal)}
                            </span>
                        `;
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
          montoTexto = formatoMoneda(costoTotal);
        }
        // --------------------------------------------------
        // CREAR FILA
        // --------------------------------------------------
        const row = document.createElement("tr");
        row.innerHTML = `
                    <td>
                        <small>${fecha}</small>
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
  // Abrir el modal
  const modal = new bootstrap.Modal(document.getElementById("modalHistorial"));
  modal.show();
}
