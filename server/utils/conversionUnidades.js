const pool = require("../config/db");

/**
 * Convierte una cantidad escrita por el usuario a número.
 *
 * Acepta:
 *  1
 *  0.5
 *  "1/2"
 *  "3/4"
 *  "1 1/2"
 */

function convertirTextoANumero(valor) {
    if (typeof valor === "number") {
        if (!Number.isFinite(valor)) {
            throw new Error("La cantidad ingresada no es válida.");
        }

        return valor;
    }

    if (typeof valor !== "string") {
        throw new Error("La cantidad ingresada no es válida.");
    }

    const texto = valor.trim();

    if (!texto) {
        throw new Error("La cantidad ingresada no puede estar vacía.");
    }

    // Número decimal o entero
    if (/^\d+(\.\d+)?$/.test(texto)) {
        const numero = Number(texto);

        if (!Number.isFinite(numero)) {
            throw new Error("La cantidad ingresada no es válida.");
        }

        return numero;
    }

    // Fracción simple: 1/2, 3/4, 2/3...
    if (/^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(texto)) {
        const partes = texto.split("/");

        const numerador = Number(partes[0]);
        const denominador = Number(partes[1]);

        if (denominador === 0) {
            throw new Error("El denominador de la fracción no puede ser 0.");
        }

        return numerador / denominador;
    }

    // Número mixto: 1 1/2, 2 3/4...
    if (/^\d+(\.\d+)?\s+\d+(\.\d+)?\/\d+(\.\d+)?$/.test(texto)) {
        const partes = texto.split(/\s+/);

        const entero = Number(partes[0]);

        const fraccion = partes[1].split("/");

        const numerador = Number(fraccion[0]);
        const denominador = Number(fraccion[1]);

        if (denominador === 0) {
            throw new Error("El denominador de la fracción no puede ser 0.");
        }

        return entero + (numerador / denominador);
    }

    throw new Error(
        `La cantidad "${valor}" no tiene un formato válido.`
    );
}


function normalizarUnidad(unidad) {
    if (typeof unidad !== "string") {
        return "";
    }

    return unidad.trim().toLowerCase();
}

//Convertir la unidad ingresada en la que se controla el inventario
async function convertirCantidad(cliente, idMa, cantidadIngresada, unidadIngresada) {

    const cantidad = convertirTextoANumero(cantidadIngresada);

    if (cantidad <= 0) {
        throw new Error("La cantidad debe ser mayor que 0.");
    }

    const unidad = normalizarUnidad(unidadIngresada);

    if (!unidad) {
        throw new Error("La unidad ingresada no puede estar vacía.");
    }

    // Obtener información de la materia prima
    const resultadoMP = await cliente.query(`
        SELECT
            id_ma,
            nombre,
            unidad_medida,
            unidad_existencia,
            unidad_por_paquete
        FROM materia_prima_y_cd
        WHERE id_ma = $1;
    `, [Number(idMa)]);

    if (resultadoMP.rowCount === 0) {
        throw new Error(
            "La materia prima seleccionada no existe."
        );
    }

    const materiaPrima = resultadoMP.rows[0];

    const unidadMedida = normalizarUnidad(
        materiaPrima.unidad_medida
    );

    const unidadExistencia = normalizarUnidad(
        materiaPrima.unidad_existencia
    );

    let factorConversion = null;

    if (unidad === unidadMedida) {

        factorConversion = 1;
    }

    else if (unidad === unidadExistencia) {

        const cantidadPorPaquete =
            Number(materiaPrima.unidad_por_paquete);

        if (
            !Number.isFinite(cantidadPorPaquete) ||
            cantidadPorPaquete <= 0
        ) {
            throw new Error(
                `La materia prima "${materiaPrima.nombre}" no tiene configurada correctamente la cantidad por presentación.`
            );
        }

        factorConversion = cantidadPorPaquete;
    }

    else {

        const resultadoConversion = await cliente.query(`
            SELECT factor_conversion
            FROM conversion_unidad
            WHERE id_ma = $1
              AND LOWER(TRIM(unidad_ingresada)) = $2;
        `, [
            Number(idMa),
            unidad
        ]);

        if (resultadoConversion.rowCount === 0) {
            throw new Error(
                `No existe una conversión configurada para "${unidadIngresada}" en la materia prima "${materiaPrima.nombre}".`
            );
        }

        factorConversion = Number(
            resultadoConversion.rows[0].factor_conversion
        );
    }

    const cantidadUtilizada = cantidad * factorConversion;

    if (!Number.isFinite(cantidadUtilizada)) {
        throw new Error(
            `No fue posible convertir la cantidad de "${materiaPrima.nombre}".`
        );
    }

    return {
        cantidadIngresada: cantidad,
        cantidadUtilizada,
        unidadIngresada: unidadIngresada.trim(),
        unidadBase: materiaPrima.unidad_medida,
        factorConversion
    };
}


module.exports = {
    convertirCantidad,
    convertirTextoANumero,
    normalizarUnidad
};