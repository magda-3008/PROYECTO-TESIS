let tabla = null;

const vistas = {
    inventario: {
        endpoint: "/api/productos",
        columns: [
            {
                title: "N°",
                field: "id_producto"
            },
            {
                title: "Nombre",
                field: "nombre"
            },
            {
                title: "Tipo",
                field: "tipo"
            },
            {
                title: "Precio",
                field: "precio_venta"
            },
            {
                title: "Margen",
                field: "margen_gananciab_esperado"
            },
            {
                title: "Estado",
                field: "estado"
            }
        ]
    },

    analisis: {

        endpoint: "/api/productos/analisis",

        columns: [

            {
                title: "Producto",
                field: "nombre"
            },

            {
                title: "Costo actual",
                field: "costo_actual"
            },

            {
                title: "Precio venta",
                field: "precio_venta"
            },

            {
                title: "Margen esperado",
                field: "margen"
            },

            {
                title: "Ganancia",
                field: "ganancia"
            }

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

        pagination: true,

        paginationSize: 10,

        movableColumns: true,

        reactiveData: true,

        columns: configuracion.columns

    });

}

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