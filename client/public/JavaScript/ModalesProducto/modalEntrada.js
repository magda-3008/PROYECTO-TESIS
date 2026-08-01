// ===== FUNCIÓN PARA MOSTRAR ALERTAS =====
function mostrarAlerta(mensaje, tipo = 'info') {
    // Si tienes un contenedor específico para alertas en tu HTML
    const alertContainer = document.getElementById('alertaContainer');
    if (alertContainer) {
        const alertHtml = `
            <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
                ${mensaje}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.innerHTML = alertHtml;
        // Auto-cerrar después de 5 segundos
        setTimeout(() => {
            const alert = alertContainer.querySelector('.alert');
            if (alert) alert.remove();
        }, 5000);
    } else {
        // Fallback: si no hay contenedor, usa alert nativo
        alert(mensaje);
    }
}

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

async function registrarEntrada() {
    if (!productoSeleccionado) {
        mostrarAlerta('Debe seleccionar un producto.', 'warning');
        return;
    }

    const tipo = document.getElementById('tipoEntrada').value;
    if (!tipo) {
        mostrarAlerta('Seleccione un tipo de entrada.', 'warning');
        return;
    }

    const cantidad = Number(document.getElementById('cantidadEntrada').value);
    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarAlerta('Ingrese una cantidad válida.', 'warning');
        return;
    }

    const observacion = document.getElementById('observacionEntrada').value.trim();

    const movimiento = {
        id_producto: productoSeleccionado.id_producto,
        tipo_movimiento: tipo,   // "COMPRA", "PRODUCCION" o "ENTRADA"
        cantidad,
        observacion
        // No enviamos anio ni mes porque el backend los calcula
    };

    try {
        const response = await fetch('/api/entrada', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(movimiento)
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.mensaje || 'Error al registrar');

        mostrarAlerta('Entrada registrada exitosamente.', 'success');
        // Cerrar modal y actualizar stock (opcional)
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalEntrada'));
        modal.hide();
        // Aquí podrías refrescar la tabla de productos

    } catch (error) {
        mostrarAlerta(error.message, 'danger');
    }
}

document.getElementById('guardarEntrada').addEventListener('click', registrarEntrada);