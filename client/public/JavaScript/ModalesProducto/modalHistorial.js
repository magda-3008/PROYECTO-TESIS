function abrirHistorial(producto){
     try {

        const respuesta = await fetch(
            `/api/movimientos/${idProducto}`
        );

        const movimientos = await respuesta.json();

        console.log(movimientos);

    } catch (error) {

        console.error(error);

    }
}