function calcularConsumoReceta(
    detallesReceta,
    cantidadProducir,
    cantidadProducidaBase
) {
    const cantidad = Number(cantidadProducir);
    const base = Number(cantidadProducidaBase);

    if (!Number.isFinite(cantidad) || cantidad <= 0) {
        throw new Error(
            "La cantidad a producir debe ser mayor que 0."
        );
    }

    if (!Number.isFinite(base) || base <= 0) {
        throw new Error(
            "La cantidad producida base de la receta no es válida."
        );
    }

    if (!Array.isArray(detallesReceta) || detallesReceta.length === 0) {
        throw new Error(
            "El producto no tiene ingredientes registrados en su receta."
        );
    }

    const factorProduccion = cantidad / base;

    return detallesReceta.map((detalle) => {
        const cantidadBase = Number(detalle.cantidad_utilizada);

        if (!Number.isFinite(cantidadBase) || cantidadBase <= 0) {
            throw new Error(
                `La cantidad utilizada del ingrediente ${detalle.id_detalle_receta} no es válida.`
            );
        }

        const cantidadNecesaria =
            cantidadBase * factorProduccion;

        if (
            !Number.isFinite(cantidadNecesaria) ||
            cantidadNecesaria <= 0
        ) {
            throw new Error(
                `No fue posible calcular el consumo del ingrediente ${detalle.id_detalle_receta}.`
            );
        }

        return {
            id_detalle_receta: detalle.id_detalle_receta,
            id_ma: detalle.id_ma || null,
            id_producto_insumo: detalle.id_producto_insumo || null,

            cantidad_utilizada_base: cantidadBase,
            cantidad_necesaria: cantidadNecesaria,

            cantidad_ingresada: detalle.cantidad_ingresada,
            unidad_ingresada: detalle.unidad_ingresada
        };
    });
}

module.exports = {
    calcularConsumoReceta
};