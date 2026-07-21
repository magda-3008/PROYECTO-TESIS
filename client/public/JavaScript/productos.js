async function cargarProductos() {

    const respuesta = await fetch("/api/productos");
    const productos = await respuesta.json();

    const tbody = document.getElementById("tablaProductos");

    let filas = "";

    productos.forEach(producto => {

        filas += `
            <tr data-id="${producto.id_producto}">
                <td>${producto.id_producto}</td>
                <td>${producto.nombre}</td>
                <td>${producto.tipo}</td>
                <td>${producto.precio_venta}</td>
                <td>${producto.margen_gananciab_esperado}</td>
                <td>${producto.estado}</td>
            </tr>
        `;

    });

    tbody.innerHTML = filas;

    new DataTable("#tabla", {
    pageLength: 10,
    lengthMenu: [5, 10, 25, 50],
    scrollX: true,    
    language: {
        url: "https://cdn.datatables.net/plug-ins/2.3.2/i18n/es-ES.json"
    }
});

table.columns.adjust().draw();
}

cargarProductos();