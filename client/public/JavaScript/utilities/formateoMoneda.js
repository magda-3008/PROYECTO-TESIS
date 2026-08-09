function formatoMoneda(valor) {
	if (valor && typeof valor.getValue === 'function') {
		valor = valor.getValue();
	}

	const num = Number(valor);

	if (isNaN(num)) return '';

	return `C$ ${new Intl.NumberFormat("es-NI", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(num)}`;
}