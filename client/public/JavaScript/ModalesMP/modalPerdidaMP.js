function abrirModalPerdidaMP(materiaprima) {

    limpiarErroresModal();

    document.getElementById("cantidadPerdida").value = "";
    document.getElementById("motivoPerdida").value = "";

    MPSeleccionada = materiaprima;

    document.getElementById("nombreMateriaPrimaPerdida").textContent =
        materiaprima.nombre;

    document.getElementById("stockActualMPPerdida").textContent =
        materiaprima.stock_actual_i;

    document.getElementById("tipoMateriaPrimaPerdida").textContent =
        materiaprima.tipo_insumo;

    const modal = new bootstrap.Modal(
        document.getElementById("modalPerdidaMP")
    );

    modal.show();
}
