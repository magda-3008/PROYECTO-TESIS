function formatoMoneda(valor) {
	// Si es un objeto con método getValue(), se extrae el valor
	if (valor && typeof valor.getValue === 'function') {
		valor = valor.getValue();
	}
	const num = Number(valor);
	if (isNaN(num)) return '';
	return new Intl.NumberFormat("es-NI", {
		style: "currency",
		currency: "NIO",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(num);
}
