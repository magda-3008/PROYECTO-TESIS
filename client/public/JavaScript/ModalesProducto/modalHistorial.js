async function abrirHistorial(producto) {
  document.getElementById("nombreProductoHistorial").textContent =
    producto.nombre;
  document.getElementById("tipoProductoHistorial").textContent = producto.tipo;
  document.getElementById("stockActualHistorial").textContent =
    producto.stock_actual || 0;

  // Mostrar indicador de carga
  const cargando = document.getElementById("cargandoHistorial");
  cargando.classList.remove("d-none");

  // Limpiar tabla anterior
  const tbody = document.getElementById("tablaMovimientos");
  tbody.innerHTML = "";

  // Obtener período seleccionado
  const periodo = document.getElementById("periodoInventario").value;
  const [anio, mes] = periodo.split("-");
  const periodoSelect = document.getElementById("periodoInventario");
  const textoPeriodo = periodoSelect.options[periodoSelect.selectedIndex].text;
  document.getElementById("periodoHistorial").textContent = textoPeriodo;

  try {
    const respuesta = await fetch(
      `/api/historial/${producto.id_producto}?anio=${anio}&mes=${mes}`,
    );
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
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-clock-history fs-4 d-block mb-2"></i>
                        No hay movimientos registrados este mes para este producto.
                    </td>
                </tr>
            `;
    } else {
      movimientos.forEach((mov) => {
        // Formatear fecha
        let fecha = "Sin fecha";
        if (mov.fecha) {
          const date = new Date(mov.fecha);
          fecha = date.toLocaleDateString("es-ES", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        } else if (mov.anio && mov.mes) {
          fecha = `${mov.mes}/${mov.anio}`;
        }

        // Badge y formateo de costo según tipo
        let tipoBadge = "";
        let montoTexto = "—";

        switch (mov.tipo_movimiento) {
          case "COMPRA":
            tipoBadge = '<span class="badge bg-success">Compra</span>';
            montoTexto = formatoMoneda(mov.costo_total);
            break;
          case "PRODUCCION":
            tipoBadge =
              '<span class="badge bg-warning text-dark">Producción</span>';
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
          case "PERDIDA":
            tipoBadge = '<span class="badge bg-danger">Pérdida</span>';
            const valorPerdida = Number(mov.costo_total);
            if (!isNaN(valorPerdida) && valorPerdida > 0) {
              montoTexto = `<span class="text-danger font-monospace">${formatoMoneda(-valorPerdida)}</span>`;
            } else {
              montoTexto = `<span class="text-danger font-monospace">${formatoMoneda(valorPerdida)}</span>`;
            }
            break;
          default:
            tipoBadge = `<span class="badge bg-secondary">${mov.tipo_movimiento}</span>`;
            montoTexto = formatoMoneda(mov.costo_total);
        }

        // Definir cantidadMostrar según si es pérdida o entrada/producción/compra
        const cant = Number(mov.cantidad) || 0;
        let cantidadMostrar = "";

        if (mov.tipo_movimiento === "PERDIDA") {
          cantidadMostrar = `<span class="text-danger">-${cant}</span>`;
        } else {
          cantidadMostrar = `<span class="text-success">+${cant}</span>`;
        }

        const row = document.createElement("tr");
        row.innerHTML = `
                    <td><small>${fecha}</small></td>
                    <td>${tipoBadge}</td>
                    <td><strong>${cantidadMostrar}</strong></td>
                    <td>${montoTexto}</td>
                    <td><small class="text-muted">${mov.observacion || "—"}</small></td>
                `;
        tbody.appendChild(row);
      });
    }
  } catch (error) {
    console.error("Error al cargar historial:", error);
    cargando.classList.add("d-none");
    tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    Error al cargar el historial: ${error.message}
                </td>
            </tr>
        `;
  }

  // Abrir el modal
  const modal = new bootstrap.Modal(document.getElementById("modalHistorial"));
  modal.show();
}
