const SINGULAR_PLURAL_UNIDADES = {
    "unidad": "unidades",
    "paquete": "paquetes",
    "caja": "cajas",
    "botella": "botellas",
    "botellita": "botellitas",
    "bolsa": "bolsas",
    "sobre": "sobres",
    "libra": "libras",
    "litro": "litros",
    "gramo": "gramos",
    "mililitro": "mililitros",
    "lata": "latas",
    "barra": "barras",
    "cucharada": "cucharadas",
    "sprayado": "sprayados",
    "pajilla": "pajillas",
    "vaso": "vasos",
    "plato": "platos",
    "taza": "tazas"
};

function pluralizarUnidad(unidad, cantidad) {
    const unidadNormalizada = String(unidad || "").toLowerCase();
    const cantidadNumerica = Number(cantidad);

    if (cantidadNumerica <= 1) {
        return unidadNormalizada;
    }

    return SINGULAR_PLURAL_UNIDADES[unidadNormalizada] || unidadNormalizada;
}

function unidadesSonEquivalentes(unidad1, unidad2) {
    const normalizar = unidad => {
        const valor = String(unidad || "")
            .trim()
            .toLowerCase();

        return SINGULAR_PLURAL_UNIDADES[valor] || valor;
    };

    return normalizar(unidad1) === normalizar(unidad2);
}