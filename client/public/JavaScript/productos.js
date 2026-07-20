async function cargarProductos() {

    const respuesta = await fetch("/api/productos");

    const productos = await respuesta.json();

    const tabla = document.getElementById("tablaProductos");

    productos.forEach(producto => {

        tabla.innerHTML += `
            <tr>
                <td>${producto.id_producto}</td>
                <td>${producto.nombre}</td>
                <td>${producto.tipo}</td>
                <td>${producto.precio_venta}</td>
                <td>${producto.margen_gananciab_esperado}</td>
                <td>${producto.estado}</td>
            </tr>
        `;

    });

}

cargarProductos();