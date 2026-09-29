function parsearCantidad(cantidad) {
    const texto = String(cantidad).trim();

    if (!texto) {
        return NaN;
    }

    // Enteros o decimales: 1, 2, 0.5, 1.25
    if (/^\d+(\.\d+)?$/.test(texto)) {
        return Number(texto);
    }

    // Fracción simple: 1/2, 3/4, 5/8
    if (/^\d+\s*\/\s*\d+$/.test(texto)) {
        const [numerador, denominador] =
            texto.split("/").map(Number);

        if (denominador === 0) {
            return NaN;
        }

        return numerador / denominador;
    }

    // Número mixto: 1 1/2, 2 3/4, etc.
    if (/^\d+\s+\d+\s*\/\s*\d+$/.test(texto)) {
        const partes = texto.split(/\s+/);

        const entero = Number(partes[0]);

        const [numerador, denominador] =
            partes[1].split("/").map(Number);

        if (denominador === 0) {
            return NaN;
        }

        return entero + numerador / denominador;
    }

    return NaN;
}