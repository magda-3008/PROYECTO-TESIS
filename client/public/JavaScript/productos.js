async function cargarProductos() {

    const respuesta = await fetch("/api/productos");
    const productos = await respuesta.json();

    new Tabulator("#tablaProductos", {
        data: productos,
        layout: "fitData",
        pagination: true,
        paginationSize: 10,
        movableColumns: true,
        columns: [
            { title: "N°", field: "id_producto" },
            { title: "Nombre", field: "nombre" },
            { title: "Tipo", field: "tipo" },
            { title: "Precio", field: "precio_venta" },
            { title: "Margen", field: "margen_gananciab_esperado" },
            { title: "Estado", field: "estado" }
        ]
    });
}

cargarProductos();