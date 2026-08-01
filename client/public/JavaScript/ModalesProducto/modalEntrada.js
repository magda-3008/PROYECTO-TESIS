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

function configurarTipoEntrada(producto){

    const selectTipo = document.getElementById("tipoEntrada");

    selectTipo.innerHTML = `
        <option value="" selected disabled>
            Seleccione una opción
        </option>
    `;

    if(producto.tipo === "Reventa"){
        selectTipo.innerHTML += `
            <option value="COMPRA">
                Compra
            </option>
            <option value="ENTRADA">
                Ajuste de inventario
            </option>
            <option value="OTRO">
                Otro
            </option>
        `;

    }else if(producto.tipo === "Elaborado"){

        selectTipo.innerHTML += `
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

            <option value="OTRO">
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