const buscador = document.getElementById("buscar-producto");

buscador.addEventListener("input", function () {

    const texto = this.value;

    if (texto === "") {
        tabla.clearFilter();
        return;
    }

    tabla.setFilter([
        { field: "nombre", type: "like", value: texto }
    ]);

});

async function cargarProductos() {

    const respuesta = await fetch("/api/productos");
    const productos = await respuesta.json();

    const tabla = new Tabulator("#tablaProductos", {
        data: productos,
        layout: "fitColumns",
        pagination: true,
        paginationSize: 30,
        movableColumns: true,
        columns: [
            { title: "N°", field: "id_producto" },
            { title: "Nombre", field: "nombre" },
            { title: "Tipo", field: "tipo" },
            { title: "Precio", field: "precio_venta" },
            { title: "Margen de ganancia bruta esperado (%)", field: "margen_gananciab_esperado" },
            { title: "Estado de producto", field: "estado" }
        ]
    });
}

cargarProductos();