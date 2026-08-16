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
        "barra": "barras"
    };

    const unidadNormalizada = String(unidad || "").toLowerCase();

    if (Number(cantidad) === 1) {
        return unidadNormalizada;
    }

    return singularPlural[unidadNormalizada] || unidadNormalizada;
}