function pluralizarUnidad(unidad, cantidad) {
    const singularPlural = {
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

    const unidadNormalizada = String(unidad || "").toLowerCase();
    const cantidadNumerica = Number(cantidad);

    // 1 unidad exacta o una fracción menor que 1
    if (cantidadNumerica <= 1) {
        return unidadNormalizada;
    }

    return singularPlural[unidadNormalizada] || unidadNormalizada;
}