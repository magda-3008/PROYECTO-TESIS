async function cargarProductos() {
    const respuesta = await fetch("/api/productos");
    const productos = await respuesta.json();
    
     $('#tabla').bootstrapTable({
        data: productos
    });
}

cargarProductos();