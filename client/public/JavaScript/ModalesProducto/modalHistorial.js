async function abrirHistorial(producto){
     try {

        const respuesta = await fetch(
            `/api/movimientos/${producto.id_producto}`
        );

        const movimientos = await respuesta.json();

        console.log(movimientos);

    } catch (error) {

        console.error(error);

    }
}