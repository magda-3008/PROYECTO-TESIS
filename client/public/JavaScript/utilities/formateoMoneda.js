function formatoMoneda(cell) {
    const valor = Number(cell.getValue());

    if (isNaN(valor)) return "";

    return new Intl.NumberFormat("es-NI", {
        style: "currency",
        currency: "NIO",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
}