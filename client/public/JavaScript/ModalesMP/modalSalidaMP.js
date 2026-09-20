function abrirModalSalidaMP(materiaprima) {
    MPSeleccionada = materiaprima;
    limpiarErroresModalMP("modalSalidaMP");
    // Limpiar formulario
    document.getElementById("motivoSalidaMP").value = "";
    document.getElementById("cantidadSalidaMP").value = "";
    document.getElementById("observacionSalidaMP").value = "";
    // Mostrar información
    document.getElementById("nombreMateriaPrimaSalida").textContent = materiaprima.nombre || "-";
    document.getElementById("tipoMateriaPrimaSalida").textContent = materiaprima.tipo_insumo || "-";
    document.getElementById("stockActualMPSalida").textContent = materiaprima.stock_actual_i ?? 0;
    const modal = new bootstrap.Modal(document.getElementById("modalSalidaMP"));
    modal.show();
}
async function registrarSalidaMP() {
    limpiarErroresModalMP("modalSalidaMP");
    if (!MPSeleccionada) {
        const error = document.getElementById("errorGeneralSalidaMP");
        error.textContent = "No se ha seleccionado una materia prima.";
        error.classList.remove("d-none");
        return;
    }
    const motivo = document.getElementById("motivoSalidaMP").value;
    const cantidad = parseFloat(document.getElementById("cantidadSalidaMP").value);
    const observacion = document.getElementById("observacionSalidaMP").value.trim();
    let valido = true;
    /* VALIDAR MOTIVO */
    if (!motivo) {
        const campo = document.getElementById("motivoSalidaMP");
        campo.classList.add("is-invalid");
        document.getElementById("errorMotivoSalidaMP").textContent = "Seleccione un motivo.";
        valido = false;
    }
    /* VALIDAR CANTIDAD */
    if (isNaN(cantidad) || cantidad <= 0) {
        const campo = document.getElementById("cantidadSalidaMP");
        campo.classList.add("is-invalid");
        document.getElementById("errorCantidadSalidaMP").textContent = "Ingrese una cantidad mayor que cero.";
        valido = false;
    } else if (cantidad > parseFloat(MPSeleccionada.stock_actual_i || 0)) {
        const campo = document.getElementById("cantidadSalidaMP");
        campo.classList.add("is-invalid");
        document.getElementById("errorCantidadSalidaMP").textContent = "La cantidad no puede ser mayor que el stock disponible.";
        valido = false;
    }
    if (!valido) return;
    try {
        const respuesta = await fetch("/api/salidaMP", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_ma: MPSeleccionada.id_ma,
                tipo_movimiento: "SALIDA",
                motivo: motivo,
                cantidad: cantidad,
                observacion: observacion || null
            })
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(datos.mensaje || datos.error || "No se pudo registrar la salida.");
        }
        /* ACTUALIZAR STOCK LOCAL */
        MPSeleccionada.stock_actual_i = parseFloat(MPSeleccionada.stock_actual_i || 0) - cantidad;
        /* EVITAR NEGATIVOS POR REDONDEO */
        if (MPSeleccionada.stock_actual_i < 0) {
            MPSeleccionada.stock_actual_i = 0;
        }
        /* ACTUALIZAR TABLA */
        if (typeof tabla !== "undefined" && tabla) {
            const fila = tabla.getRow(MPSeleccionada.id_ma);
            if (fila) {
                fila.update({
                    stock_actual_i: MPSeleccionada.stock_actual_i
                });
            }
        }
        /* MENSAJE */
        await Swal.fire({
            icon: "success",
            title: "Salida registrada",
            text: "La salida de materia prima se registró correctamente.",
            confirmButtonText: "Aceptar"
        });
        /* CERRAR MODAL */
        const modalElement = document.getElementById("modalSalidaMP");
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    } catch (error) {
        console.error("Error al registrar salida de MP:", error);
        const errorGeneral = document.getElementById("errorGeneralSalidaMP");
        errorGeneral.textContent = error.message || "Ocurrió un error al registrar la salida.";
        errorGeneral.classList.remove("d-none");
    }
}
document.getElementById("guardarSalidaMP")?.addEventListener("click", registrarSalidaMP);
