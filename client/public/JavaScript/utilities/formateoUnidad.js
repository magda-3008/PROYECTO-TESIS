function convertirFraccionANumero(valor) {
    if (typeof valor === "number") {
        return valor;
    }

    if (typeof valor !== "string") {
        return NaN;
    }

    const texto = valor.trim();

    // Fracción simple: 1/2, 3/4, 2/4...
    if (/^\d+(\.\d+)?\/\d+(\.\d+)?$/.test(texto)) {
        const partes = texto.split("/");

        const numerador = Number(partes[0]);
        const denominador = Number(partes[1]);

        if (denominador === 0) {
            return NaN;
        }

        return numerador / denominador;
    }

    // Número decimal: "0.5", "1.25", etc.
    const numero = Number(texto);

    return Number.isFinite(numero) ? numero : NaN;
}

function formatearUnidadHumana(cantidad, unidad) {

    const num = convertirFraccionANumero(cantidad);

    if (isNaN(num)) {
        return `${cantidad} ${unidad}`;
    }

    const unidadFormateada = pluralizarUnidad(unidad, num);

    const fracciones = {
        0.25: "¼",
        0.5: "½",
        0.75: "¾"

    };

    // Cantidades enteras
    if (Number.isInteger(num)) {
        return `${num} ${unidadFormateada}`;
    }

    // Fracciones simples
    if (fracciones[num]) {
        return `${fracciones[num]} ${unidadFormateada}`;
    }

    // Otros decimales
    return `${num} ${unidadFormateada}`;
}

