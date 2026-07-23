let tabla = null;

const vistas = {
    inventario: {
        endpoint: "/api/productos",
        columns: [
            { title: "Nombre", field: "nombre"},
            { title: "Tipo", field: "tipo"},
            { title: "Precio de venta", field: "precio_venta"},
            { title: "Costo de compra/producción", field: "costo"},
            { title: "Margen de ganancia bruta esperado (%)", field: "margen_gananciab_esperado"},
            { title: "Estado", field: "estado"},
            { title: "Existencias", field: "stock_actual"},
            { title: "Acciones", field: "acciones", hozAlign: "center", headerSort: false, width: 90, formatter: function () {

        return `
            <div class="dropdown">

            <button class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
                <i class="bi bi-three-dots-vertical"></i>
            </button>    

                <ul class="dropdown-menu">
                    <li>
                        <a class="dropdown-item registrar-perdida" href="#">
                            📉 Registrar pérdida
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item registrar-entrada" href="#">
                            📦 Registrar entrada
                        </a>
                    </li>
                    <li>
                        <a class="dropdown-item ver-historial" href="#">
                            📄 Ver historial
                        </a>
                    </li>
                </ul>
            </div>
        `;

    },

    cellClick: function(e, cell){

        const producto = cell.getRow().getData();

        if(e.target.closest(".registrar-perdida")){

            abrirModalPerdida(producto);

        }

        if(e.target.closest(".registrar-entrada")){

            abrirModalEntrada(producto);

        }

        if(e.target.closest(".ver-historial")){

            abrirHistorial(producto);

        }

    }

}
        ]
    },

    analisis: {
        endpoint: "/api/productos/analisis",
        columns: [
            { title: "Producto", field: "nombre_producto"},
            { title: "Costo unitario de producción", field: "costo_unitario_prod"},
            { title: "Margen de ganancia esperado (C$)", field: "margen_esperado_cordobas"},
            { title: "Precio de venta actual", field: "precio_venta_actual"},
            { title: "Precio de venta sugerido", field: "precio_venta_sugerido"},
            { title: "Ganancia real (C$)", field: "ganancia_real_cordobas"}
        ]
    }
};

cargarVista("inventario");

async function cargarVista(vista){
    if(tabla){
        tabla.destroy();
    }

    const configuracion = vistas[vista];

    const respuesta = await fetch(configuracion.endpoint);

    const datos = await respuesta.json();

    tabla = new Tabulator("#tablaProductos", {
        data: datos,
        layout: "fitColumns",
        rowHeader:{formatter:"rownum", headerSort:false, resizable:false, frozen:true, width:20},
        pagination: true,
        paginationSize: 30,
        reactiveData: true,
        columns: configuracion.columns

    });

}

const buscador = document.getElementById("buscar");

buscador.addEventListener("input", function(){

    const texto = this.value.toLowerCase();

    if(texto === ""){

        tabla.clearFilter();

        return;

    }

    tabla.setFilter(function(data){

        return Object.values(data).some(valor =>

            String(valor)
                .toLowerCase()
                .includes(texto)

        );

    });

});

const tabs = document.querySelectorAll("#tabsProductos .nav-link");

tabs.forEach(tab => {

    tab.addEventListener("click", () => {

        document
            .querySelector("#tabsProductos .active")
            .classList.remove("active");

        tab.classList.add("active");

        cargarVista(tab.dataset.vista);

    });

});

function abrirModalPerdida(producto){

    console.log(producto);

}

function abrirModalEntrada(producto){

    console.log(producto);

}

function abrirHistorial(producto){

    console.log(producto);

}