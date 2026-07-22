let tabla = null;

const vistas = {
    inventario: {
        endpoint: "/api/productos",
        columns: [
            { title: "Nombre", field: "nombre"},
            { title: "Tipo", field: "tipo"},
            { title: "Precio", field: "precio_venta"},
            { title: "Margen", field: "margen_gananciab_esperado"},
            { title: "Estado", field: "estado"}
        ]
    },

    analisis: {
        endpoint: "/api/productos/analisis",
        columns: [
            { title: "Producto", field: "nombre"},
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
        rowHeader:{formatter:"rownum", headerSort:false, hozAlign:"center", resizable:false, frozen:true},
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