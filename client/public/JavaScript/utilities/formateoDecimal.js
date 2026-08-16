function decimalAFraccion(numero) {
    const valor = Number(numero);

    if (!Number.isFinite(valor)) return "0";

    // Si es entero
    if (Number.isInteger(valor)) {
        return String(valor);
    }

    const parteEntera = Math.floor(valor);
    const decimal = valor - parteEntera;

    const fracciones = [
        { decimal: 0.125, texto: "1/8" },
        { decimal: 0.25, texto: "1/4" },
        { decimal: 0.333, texto: "1/3" },
        { decimal: 0.375, texto: "3/8" },
        { decimal: 0.5, texto: "1/2" },
        { decimal: 0.625, texto: "5/8" },
        { decimal: 0.666, texto: "2/3" },
        { decimal: 0.75, texto: "3/4" },
        { decimal: 0.875, texto: "7/8" }
    ];

    // Buscar la fracción más cercana
    let fraccionMasCercana = null;
    let diferenciaMinima = Infinity;

    fracciones.forEach(fraccion => {
        const diferencia = Math.abs(decimal - fraccion.decimal);

        if (diferencia < diferenciaMinima) {
            diferenciaMinima = diferencia;
            fraccionMasCercana = fraccion;
        }
    });

    // Si no se parece suficientemente a una fracción conocida,
    // se deja el decimal original.
    if (diferenciaMinima > 0.02) {
        return valor.toString();
    }

    // Si no hay parte entera
    if (parteEntera === 0) {
        return fraccionMasCercana.texto;
    }

    // Si hay parte entera
    return `${parteEntera} ${fraccionMasCercana.texto}`;
}