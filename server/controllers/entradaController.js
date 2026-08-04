const pool = require('../config/db');
async function registrarProduccion(client, idProducto, cantidadLotes, observacion, anio, mes) {
	// 1. Validar producto y que sea de tipo 'Elaborado' con bloqueo FOR UPDATE
	const resProducto = await client.query(`SELECT tipo FROM producto WHERE id_producto = $1 FOR UPDATE`,
		[idProducto]);
	if (resProducto.rows.length === 0) throw new Error("Producto no encontrado.");
	if (resProducto.rows[0].tipo !== "Elaborado") {
		throw new Error("El producto no es de tipo Elaborado. No se puede registrar producción.");
	}
	// 2. Consultar receta para conocer la cantidad producida base por lote
	const resReceta = await client.query(`SELECT cantidad_producida_base FROM receta WHERE id_producto = $1 LIMIT 1`,
		[idProducto]);
	if (resReceta.rows.length === 0) throw new Error("El producto no tiene receta asociada.");
	const cantidadProducidaBase = Number(resReceta.rows[0].cantidad_producida_base) || 1;
	const cantidadLotesNum = Number(cantidadLotes);
	const cantidadFinalUnidades = cantidadLotesNum * cantidadProducidaBase;
	// 3. Obtener el costo unitario actual de producción desde la vista
	const resCosto = await client.query(`SELECT COALESCE(costo_unitario_prod, 0) AS costo_unitario
         FROM v_productos_elaborados_costo_actual
         WHERE id_producto = $1`,
		[idProducto]);
	const costoUnitarioCongelado = Number(resCosto.rows[0]?.costo_unitario) || 0.00;
	// El costo total refleja la valoración monetaria de todas las unidades producidas
	const costoTotalProduccion = cantidadFinalUnidades * costoUnitarioCongelado;
	// 4. Asegurar registro mensual en inventario_mensual_producto
	await client.query(`INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
		[anio, mes, idProducto]);
	// 5. Registrar movimiento guardando costo_unitario y costo_total
	await client.query(`INSERT INTO movimiento_producto 
            (id_producto, anio, mes, tipo_movimiento, cantidad, costo_unitario, costo_total, observacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
		[
			idProducto,
			anio,
			mes, "PRODUCCION",
			cantidadLotesNum,
			costoUnitarioCongelado,
			costoTotalProduccion,
			observacion || null
		]);
	// 6. Actualizar stock sumando las UNIDADES totales
	await client.query(`UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
		[cantidadFinalUnidades, anio, mes, idProducto]);
}
module.org = {
	registrarProduccion
};
