// Mapeo de opciones (los valores son los que espera el backend)
const opcionesPorTipo = {
    Reventa: [
        { value: 'COMPRA', label: 'Compra' },
        { value: 'ENTRADA', label: 'Ajuste de inventario' },
        { value: 'ENTRADA', label: 'Otro' }   // ambos usan "ENTRADA"
    ],
    Elaborado: [
        { value: 'PRODUCCION', label: 'Producción' },
        { value: 'ENTRADA', label: 'Ajuste de inventario' },
        { value: 'ENTRADA', label: 'Otro' }
    ]
};

function cargarTiposEntrada(producto) {
    const select = document.getElementById('tipoEntrada');
    const opciones = opcionesPorTipo[producto.tipo] || [];

    select.innerHTML = `
        <option value="" selected disabled>Seleccione una opción</option>
        ${opciones.map(op => `<option value="${op.value}">${op.label}</option>`).join('')}
    `;
}

// Cambiar etiqueta
document.getElementById('tipoEntrada').addEventListener('change', function () {
    const label = document.getElementById('labelCantidadEntrada');
    label.textContent = this.value === 'PRODUCCION' ? 'Cantidad de lotes' : 'Cantidad ingresada';
});


function abrirModalEntrada(producto){
    cantidadEntrada.value = "";
    observacionEntrada.value = "";
    tipoEntrada.selectedIndex = 0;
    productoSeleccionado = producto;

    document.getElementById("nombreProductoEntrada").textContent = producto.nombre;
    document.getElementById("stockActualEntrada").textContent = producto.stock_actual;
    document.getElementById("tipoProductoEntrada").textContent = producto.tipo;

    cargarTiposEntrada(producto);

    const modal = new bootstrap.Modal(
        document.getElementById("modalEntrada")
    );

    modal.show();

}

// Helper para limpiar todos los mensajes de error
function limpiarErroresModal() {
    document.querySelectorAll('#modalEntrada .error-msg').forEach(el => el.textContent = '');
    document.querySelectorAll('#modalEntrada .is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

// Helper para mostrar error en un campo específico
function mostrarErrorCampo(idInput, idError, mensaje) {
    const input = document.getElementById(idInput);
    const errorEl = document.getElementById(idError);
    
    if (input) input.classList.add('is-invalid');
    if (errorEl) errorEl.textContent = mensaje;
}

async function registrarEntrada() {
    limpiarErroresModal();
    let esValido = true;

    // Validaciones inline
    if (!productoSeleccionado) {
        document.getElementById('errorGeneral').textContent = 'Debe seleccionar un producto.';
        return;
    }

    const tipoInput = document.getElementById('tipoEntrada');
    const tipo = tipoInput.value;
    if (!tipo) {
        mostrarErrorCampo('tipoEntrada', 'errorTipo', 'Seleccione un tipo de entrada.');
        esValido = false;
    }

    const cantidadInput = document.getElementById('cantidadEntrada');
    const cantidad = Number(cantidadInput.value);
    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarErrorCampo('cantidadEntrada', 'errorCantidad', 'Ingrese una cantidad válida mayor a 0.');
        esValido = false;
    }

    if (!esValido) return;

    const observacion = document.getElementById('observacionEntrada').value.trim();

    const movimiento = {
        id_producto: productoSeleccionado.id_producto,
        tipo_movimiento: tipo,
        cantidad,
        observacion
    };

    try {
        const response = await fetch('/api/entrada', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movimiento)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.mensaje || 'Error al registrar el movimiento.');

        // Cerrar Modal
        const modalEl = document.getElementById('modalEntrada');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();

        // Actualización de tabla:
        // Opción A: al mantener una función que carga el inventario desde el backend
        if (typeof cargarProductos === 'function') {
            await cargarProductos();
        } 
        // Opción B: actualización local en memoria
        else if (productoSeleccionado && typeof renderizarFilaProducto === 'function') {
            productoSeleccionado.stock += cantidad;
            renderizarFilaProducto(productoSeleccionado);
        }

    } catch (error) {
        document.getElementById('errorGeneral').textContent = error.message;
    }
}

// Limpiar errores automáticamente cuando el usuario abre o cierra el modal
const modalEntrada = document.getElementById('modalEntrada');
if (modalEntrada) {
    modalEntrada.addEventListener('hidden.bs.modal', limpiarErroresModal);
}

document.getElementById('guardarEntrada').addEventListener('click', registrarEntrada);