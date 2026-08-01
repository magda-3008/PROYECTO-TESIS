document
.getElementById("tipoEntrada")
.addEventListener("change", function(){

    const label = document.getElementById(
        "labelCantidadEntrada"
    );


    if(this.value === "PRODUCCION"){

        label.textContent = "Cantidad de lotes";

    }else{

        label.textContent = "Cantidad ingresada";

    }

});

function cargarTiposEntrada(producto){

    const select = document.getElementById("tipoEntrada");

    select.innerHTML = `
        <option value="" selected disabled>
            Seleccione una opción
        </option>
    `;


    if(producto.tipo === "Reventa"){

        select.innerHTML += `
            <option value="COMPRA">
                Compra
            </option>

            <option value="ENTRADA">
                Ajuste de inventario
            </option>

            <option value="ENTRADA">
                Otro
            </option>
        `;

    }


    if(producto.tipo === "Elaborado"){

        select.innerHTML += `
            <option value="PRODUCCION">
                Producción
            </option>

            <option value="ENTRADA">
                Ajuste de inventario
            </option>

            <option value="OTRO">
                Otro
            </option>
        `;

    }
}

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

const btnGuardarEntrada = document.getElementById("guardarEntrada");
const tipoEntrada = document.getElementById("tipoEntrada");
const cantidadEntrada = document.getElementById("cantidadEntrada");
const observacionEntrada = document.getElementById("observacionEntrada");

btnGuardarEntrada.addEventListener("click", registrarEntrada);

async function registrarEntrada() {

    if (!productoSeleccionado) {
        mostrarAlerta("Debe seleccionar un producto.", "warning");
        return;
    }

    if (!tipoEntrada.value) {
        mostrarAlerta("Seleccione un tipo de entrada.", "warning");
        return;
    }

    const cantidad = Number(cantidadEntrada.value);

    if (isNaN(cantidad) || cantidad <= 0) {
        mostrarAlerta("Ingrese una cantidad válida.", "warning");
        return;
    }

    const movimiento = {
        id_producto: productoSeleccionado.id_producto,
        tipo_movimiento: tipoEntrada.value,
        cantidad,
        observacion: observacionEntrada.value.trim()
    };

    console.log(movimiento);

    // Aquí luego llamaremos al backend.
}