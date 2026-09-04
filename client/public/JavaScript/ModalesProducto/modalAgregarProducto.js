document.addEventListener("DOMContentLoaded", async () => {

    const contenedor = document.getElementById(
        "contenedorModalAgregarProducto"
    );

    const btnAgregarProducto = document.getElementById(
        "btnAgregarProducto"
    );

    // Verificar que existan los elementos necesarios
    if (!contenedor) {
        console.error(
            "No se encontró el contenedor #contenedorModalAgregarProducto"
        );
        return;
    }

    if (!btnAgregarProducto) {
        console.error(
            "No se encontró el botón #btnAgregarProducto"
        );
        return;
    }

    try {

        // Cargar el HTML del modal
        const respuesta = await fetch("agregar-producto.html");

        if (!respuesta.ok) {
            throw new Error(
                `No se pudo cargar agregar-producto.html (${respuesta.status})`
            );
        }

        const html = await respuesta.text();

        // Insertar el modal en productos.html
        contenedor.innerHTML = html;

        // Obtener el modal después de insertarlo
        const modalElemento = document.getElementById(
            "modalAgregarProducto"
        );

        if (!modalElemento) {
            console.error(
                "No se encontró #modalAgregarProducto dentro de agregar-producto.html"
            );
            return;
        }

        // Crear la instancia de Bootstrap
        const modalAgregarProducto = new bootstrap.Modal(
            modalElemento
        );

        // Abrir el modal al hacer clic en "Agregar producto"
        btnAgregarProducto.addEventListener("click", () => {
            modalAgregarProducto.show();
        });

    } catch (error) {

        console.error(
            "Error al cargar el modal de agregar producto:",
            error
        );

    }

});