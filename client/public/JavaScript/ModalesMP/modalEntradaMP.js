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
    document.getElementById("stockActualMPSalida").textContent = formatearStockMateriaPrima(materiaprima);
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
    const cantidadTexto =
        document.getElementById("cantidadSalidaMP").value.trim();

    const cantidadHumana =
        parsearCantidad(cantidadTexto);

    const observacion = document.getElementById("observacionSalidaMP").value.trim();
    let valido = true;
    // ---------------- VALIDAR MOTIVO ----------------
    if (!motivo) {
        const campo = document.getElementById("motivoSalidaMP");
        campo.classList.add("is-invalid");
        document.getElementById("errorMotivoSalidaMP").textContent = "Seleccione un motivo.";
        valido = false;
    }
    // ---------------- VALIDAR CANTIDAAAAD ----------------
    if (!Number.isFinite(cantidadHumana) || cantidadHumana <= 0) {
        const campo =
            document.getElementById("cantidadSalidaMP");

        campo.classList.add("is-invalid");

        document.getElementById(
            "errorCantidadSalidaMP"
        ).textContent =
            "Ingrese una cantidad válida mayor que cero.";

        valido = false;
    }
    if (!valido) return;
    // ---------------- REGISTRAR MOVIMIENTO ----------------
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
                cantidad: cantidadHumana,
                observacion: observacion || null
            })
        });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(datos.mensaje || datos.error || "No se pudo registrar la salida.");
        }
        // ---------------- ACTUALIZAR STOCK ----------------
        MPSeleccionada.stock_actual_i =
            datos.nuevoStock;
        document.getElementById("stockActualMPSalida").textContent = formatearStockMateriaPrima(MPSeleccionada);
        // ---------------- ACTUALIZAR TABLA ----------------
        if (typeof tablaMD !== "undefined" && tablaMD) {

            tablaMD.updateData([
                {
                    id_ma: MPSeleccionada.id_ma,
                    stock_actual_i: MPSeleccionada.stock_actual_i
                }
            ]);

        }
        // ---------------- MENSAJE ----------------
        await Swal.fire({
            icon: "success",
            title: "Salida registrada",
            text: "La salida de materia prima se registró correctamente.",
            confirmButtonText: "Aceptar"
        });
        // ---------------- CERRAR MODAL ----------------
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
