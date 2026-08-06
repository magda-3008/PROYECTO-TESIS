function formatearFecha(movimiento) {
	if (movimiento.fecha) {
		const fecha = new Date(movimiento.fecha);
		return fecha.toLocaleDateString("es-ES", {
			year: "numeric",
			month: "short",
			day: "numeric"
		});
	}
	if (movimiento.anio && movimiento.mes) {
		return `${movimiento.mes}/${movimiento.anio}`;
	}
	return "Sin fecha";
}
