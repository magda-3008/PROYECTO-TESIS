let MPSeleccionada = null;

function limpiarErroresModalMP(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.querySelectorAll(".text-danger").forEach(elemento => {
        elemento.textContent = "";
    });
    modal.querySelectorAll(".is-invalid").forEach(elemento => {
        elemento.classList.remove("is-invalid");
    });
    modal.querySelectorAll(".alert-danger").forEach(elemento => {
        elemento.textContent = "";
        elemento.classList.add("d-none");
    });
}

function cargarMotivosEntradaMP() {
    const select = document.getElementById("motivoEntradaMP");
    if (!select) return;
    select.innerHTML = `
        <option value="">
            Seleccione un motivo
        </option>

        <option value="COMPRA">
            Compra
        </option>

        <option value="AJUSTE">
            Ajuste de inventario
        </option>

        <option value="OTRO">
            Otro
        </option>
    `;
}

function abrirModalEntradaMP(materiaprima) {
    MPSeleccionada = materiaprima;
    limpiarErroresModalMP("modalEntradaMP");
    // Limpiar formulario
    document.getElementById("motivoEntradaMP").value = "";
    document.getElementById("cantidadEntradaMP").value = "";
    document.getElementById("observacionEntradaMP").value = "";
    // Mostrar información
    document.getElementById("nombreMateriaPrimaEntrada").textContent = materiaprima.nombre || "-";
    document.getElementById("tipoMateriaPrimaEntrada").textContent = materiaprima.tipo_insumo || "-";
    document.getElementById("stockActualMPEntrada").textContent = materiaprima.stock_actual_i ?? 0;
    // Cargar motivos
    cargarMotivosEntradaMP();
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById("modalEntradaMP"));
    modal.show();
}
async function registrarEntradaMP() {
    limpiarErroresModalMP("modalEntradaMP");
    if (!MPSeleccionada) {
        const error = document.getElementById("errorGeneralEntradaMP");
        error.textContent = "No se ha seleccionado una materia prima.";
        error.classList.remove("d-none");
        return;
    }
    const motivo = document.getElementById("motivoEntradaMP").value;
    const cantidad = parseFloat(document.getElementById("cantidadEntradaMP").value);
    const observacion = document.getElementById("observacionEntradaMP").value.trim();
    let valido = true;
    /* VALIDAR MOTIVO */
    if (!motivo) {
        const campo = document.getElementById("motivoEntradaMP");
        campo.classList.add("is-invalid");
        document.getElementById("errorMotivoEntradaMP").textContent = "Seleccione un motivo.";
        valido = false;
    }
    /* VALIDAR CANTIDAD */
    if (isNaN(cantidad) || cantidad <= 0) {
        const campo = document.getElementById("cantidadEntradaMP");
        campo.classList.add("is-invalid");
        document.getElementById("errorCantidadEntradaMP").textContent = "Ingrese una cantidad mayor que cero.";
        valido = false;
    }
    if (!valido) return;
    try {
        const respuesta = await fetch("/api/entradaMP", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                id_ma: MPSeleccionada.id_ma,
                tipo_movimiento: "ENTRADA",
                motivo: motivo,
                cantidad: cantidad,
                observacion: observacion || null
            })
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(datos.mensaje || datos.error || "No se pudo registrar la entrada.");
        }
        /* ACTUALIZAR STOCK LOCAL */
        MPSeleccionada.stock_actual_i = parseFloat(MPSeleccionada.stock_actual_i || 0) + cantidad;
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
            title: "Entrada registrada",
            text: "La entrada de materia prima se registró correctamente.",
            confirmButtonText: "Aceptar"
        });
        /* CERRAR MODAL */
        const modalElement = document.getElementById("modalEntradaMP");
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    } catch (error) {
        console.error("Error al registrar entrada de MP:", error);
        const errorGeneral = document.getElementById("errorGeneralEntradaMP");
        errorGeneral.textContent = error.message || "Ocurrió un error al registrar la entrada.";
        errorGeneral.classList.remove("d-none");
    }
}
document.getElementById("guardarEntradaMP")?.addEventListener("click", registrarEntradaMP);
