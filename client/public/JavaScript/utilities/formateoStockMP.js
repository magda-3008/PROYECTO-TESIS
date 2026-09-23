function formatearStockMateriaPrima(materiaPrima) {

    if (!materiaPrima) {
        return "";
    }

    const stock = Number(materiaPrima.stock_actual_i);
    const contenidoPresentacion =
        Number(materiaPrima.unidad_por_paquete);

    const unidadMedida =
        String(materiaPrima.unidad_medida || "").trim();

    const unidadExistencia =
        String(materiaPrima.unidad_existencia || "").trim();

    if (!Number.isFinite(stock)) {
        return "";
    }

    //Si la unidad de existencia es igual a la unidad de medida, no se calculan presentaciones
    if (
        unidadMedida.toLowerCase() ===
        unidadExistencia.toLowerCase()
    ) {
        return formatearUnidadHumana(
            stock,
            unidadExistencia
        );
    }

    //Si la presentación no tiene un contenido válido, se muestra la unidad normalizada.
    if (
        !Number.isFinite(contenidoPresentacion) ||
        contenidoPresentacion <= 0
    ) {
        return formatearUnidadHumana(
            stock,
            unidadMedida
        );
    }

    const presentacionesCompletas = Math.floor(
        stock / contenidoPresentacion
    );

    const sobrante = limpiarDecimal(
        stock -
        (presentacionesCompletas * contenidoPresentacion)
    );

    if (presentacionesCompletas === 0) {

        const proporcion =
            stock / contenidoPresentacion;

        if (esFraccionSencilla(proporcion)) {
            return formatearUnidadHumana(
                proporcion,
                unidadExistencia
            );
        }

        return formatearUnidadHumana(
            stock,
            unidadMedida
        );
    }

    if (sobrante === 0) {
        return formatearUnidadHumana(
            presentacionesCompletas,
            unidadExistencia
        );
    }

    const proporcion =
        stock / contenidoPresentacion;

    if (esFraccionSencilla(proporcion)) {
        return formatearUnidadHumana(
            proporcion,
            unidadExistencia
        );
    }

    return (
        `${formatearUnidadHumana(
            presentacionesCompletas,
            unidadExistencia
        )} + ` +
        `${formatearUnidadHumana(
            sobrante,
            unidadMedida
        )}`
    );
}

function esFraccionSencilla(valor) {

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return false;
    }

    const decimal = limpiarDecimal(
        numero - Math.floor(numero)
    );

    return (
        decimal === 0 ||
        decimal === 0.25 ||
        decimal === 0.5 ||
        decimal === 0.75
    );
}

function limpiarDecimal(numero) {
    return Number(Number(numero).toFixed(6));
}
