async function abrirHistorial(producto){
     try {

        const respuesta = await fetch(
            `/api/historial/${producto.id_producto}`
        );

        const movimientos = await respuesta.json();

        console.log(movimientos);

    } catch (error) {

        console.error(error);

    }
}