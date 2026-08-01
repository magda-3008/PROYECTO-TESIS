function abrirModalPerdida(producto){
    productoSeleccionado = producto;
    document.getElementById("nombreProductoPerdida").textContent = producto.nombre;
    document.getElementById("stockActualPerdida").textContent = producto.stock_actual;
    document.getElementById("tipoProductoPerdida").textContent = producto.tipo;

    const modal = new bootstrap.Modal(
        document.getElementById("modalPerdida")
    );

    modal.show();
}