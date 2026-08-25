// Mapeo de opciones (los valores son los que espera el backend)
const opcionesMovimiento = {
    materiaPrima: [
        { value: "COMPRA", label: "Compra" },
        { value: "ENTRADA", label: "Ajuste de inventario" },
        { value: "ENTRADA", label: "Otro" },
    ]
};

function cargarTiposEntrada() {
    const select = document.getElementById("tipoEntrada");

    select.innerHTML = `
        <option value="" selected disabled>Seleccione una opción</option>
        <option value="COMPRA">Compra</option>
        <option value="ENTRADA">Ajuste de inventario</option>
        <option value="ENTRADA">Otro</option>
    `;
}

function abrirModalEntradaMP(materiaprima) {

    limpiarErroresModal();

    document.getElementById("cantidadEntrada").value = "";
    document.getElementById("observacionEntrada").value = "";

    MPSeleccionada = materiaprima;

    document.getElementById("nombreMateriaPrimaEntrada").textContent =
        materiaprima.nombre;

    document.getElementById("stockActualMPEntrada").textContent =
        materiaprima.stock_actual_i;

    document.getElementById("tipoMateriaPrimaEntrada").textContent =
        materiaprima.tipo_insumo;

    cargarTiposEntrada();

    const modal = new bootstrap.Modal(
        document.getElementById("modalEntradaMP")
    );

    modal.show();
}

// Helper para limpiar todos los mensajes de error
function limpiarErroresModal() {
    document
        .querySelectorAll("#modalEntradaMP .error-msg")
        .forEach((el) => (el.textContent = ""));
    document
        .querySelectorAll("#modalEntradaMP .is-invalid")
        .forEach((el) => el.classList.remove("is-invalid"));
    const errorGen = document.getElementById("errorGeneral");
    if (errorGen) errorGen.textContent = "";
}

// Helper para mostrar error en un campo específico
function mostrarErrorCampo(idInput, idError, mensaje) {
    const input = document.getElementById(idInput);
    const errorEl = document.getElementById(idError);
    if (input) input.classList.add("is-invalid");
    if (errorEl) errorEl.textContent = mensaje;
}

async function registrarEntrada() {
    limpiarErroresModal();
    let esValido = true;
    if (!MPSeleccionada) {
        document.getElementById("errorGeneral").textContent =
            "Debe seleccionar un ingrediente/insumo";
        return;
    }

    // Tipo de Entrada
    const tipoInput = document.getElementById("tipoEntrada");
    const tipo = tipoInput.value;
    if (!tipo) {
        mostrarErrorCampo(
            "tipoEntrada",
            "errorTipo",
            "Seleccione un tipo de entrada.",
        );
        esValido = false;
    }

    // Cantidad
    const cantidadInput = document.getElementById("cantidadEntrada");
    const cantidad = Number(cantidadInput.value);
    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarErrorCampo(
            "cantidadEntrada",
            "errorCantidad",
            "Ingrese una cantidad válida mayor a 0.",
        );
        esValido = false;
    }

    if (!esValido) return;

    const observacion = document
        .getElementById("observacionEntrada")
        .value.trim();

    const movimiento = {
        id_ma: MPSeleccionada.id_ma,
        tipo_movimiento: tipo,
        cantidad: cantidad,
        observacion: observacion,
    };

    try {
        const response = await fetch("/api/entradaMP", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(movimiento),
        });
        const data = await response.json();
        if (!response.ok)
            throw new Error(
                data.error || data.mensaje || "Error al registrar el movimiento.",
            );

        const nuevoStock =
            data.nuevo_stock_actual !== undefined
                ? data.nuevo_stock_actual
                : Number(MPSeleccionada.stock_actual_i) + cantidad;

        MPSeleccionada.stock_actual_i = nuevoStock;

        Swal.fire({
            icon: "success",
            title: "Entrada registrada correctamente",
            returnFocus: false
        });

        // Actualización instantánea en la tabla Tabulator
        if (typeof tabla !== "undefined" && tabla) {
            tabla.updateData([
                {
                    id_ma: MPSeleccionada.id_ma,
                    stock_actual_i: nuevoStock,
                },
            ]);
        }

        // Cerrar Modal
        const modalEl = document.getElementById("modalEntradaMP");
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
    } catch (error) {
        console.error("Error al registrar la entrada:", error);

        document.getElementById("errorGeneral").textContent = error.message;

        Swal.fire({
            icon: "error",
            text: "No se pudo registrar la entrada",
            returnFocus: false
        });
    }
}

// Limpiar errores automáticamente cuando el usuario cierra el modal
const modalEntrada = document.getElementById("modalEntradaMP");
if (modalEntrada) {
    modalEntrada.addEventListener("hidden.bs.modal", limpiarErroresModal);
}

document
    .getElementById("guardarEntrada")
    .addEventListener("click", registrarEntrada);