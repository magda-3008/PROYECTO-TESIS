function convertirCantidadAUnidadMedida(cantidad, materiaPrima) {
    const cantidadHumana = Number(cantidad);
    const unidadMedida = String(materiaPrima.unidad_medida || "").trim();
    const unidadExistencia = String(materiaPrima.unidad_existencia || "").trim();
    const unidadPorPaquete = Number(materiaPrima.unidad_por_paquete);

    if (!Number.isFinite(cantidadHumana) || cantidadHumana <= 0) {
        throw new Error("La cantidad debe ser mayor que cero.");
    }

    // Si ambas unidades son iguales,
    // no se realiza ninguna conversión.
    if (
        unidadMedida.toLowerCase() ===
        unidadExistencia.toLowerCase()
    ) {
        return cantidadHumana;
    }

    if (!Number.isFinite(unidadPorPaquete) || unidadPorPaquete <= 0) {
        throw new Error(
            "La materia prima no tiene una equivalencia de presentación válida."
        );
    }

    return cantidadHumana * unidadPorPaquete;
}