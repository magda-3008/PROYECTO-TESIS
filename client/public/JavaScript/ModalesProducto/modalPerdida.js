function abrirModalPerdida(producto){

    productoSeleccionado = producto;

    document.getElementById("nombreProductoPerdida").textContent =
        producto.nombre;

    document.getElementById("stockActualPerdida").textContent =
        producto.stock_actual;

    document.getElementById("cantidadPerdida").value = "";
    document.getElementById("motivoPerdida").value = "";

    const modal = new bootstrap.Modal(
        document.getElementById("modalPerdida")
    );

    modal.show();

}