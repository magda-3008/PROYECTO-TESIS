function formatoPorcentaje(cell) {
    const valor = Number(cell.getValue());

    if (isNaN(valor)) return "";

    return `${valor.toFixed(2)} %`;
}