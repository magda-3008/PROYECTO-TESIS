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
    autoWidth: false,
    scrollX: true,
   columnDefs: [
    { width: "30px", targets: 0 },
    { width: "100px", targets: 1 },
    { width: "100px", targets: 2 },
    { width: "80px", targets: 3 },
    { width: "80px", targets: 4 },
    { width: "80px", targets: 5 }
],
    language: {
        url: "https://cdn.datatables.net/plug-ins/2.3.2/i18n/es-ES.json"
    }
});
}

cargarProductos();