const pool = require('../config/db');
const registrarPerdidaProducto = async (req, res) => {
	const client = await pool.connect();
	try {
		const {
			id_producto,
			anio,
			mes,
			cantidad,
			observacion
		} = req.body;
		if (!id_producto || !anio || !mes || !cantidad || cantidad <= 0 || !observacion) {
			return res.status(400).json({
				error: "Datos de pérdida incompletos o inválidos."
			});
		}
		await client.query('BEGIN');
		// Obtener producto con su costo_unitario actual y bloqueo
		const resProducto = await client.query(`SELECT id_producto, stock_actual, costo_unitario 
             FROM producto 
             WHERE id_producto = $1 FOR UPDATE`,
			[id_producto]);
		if (resProducto.rows.length === 0) {
			await client.query('ROLLBACK');
			return res.status(404).json({
				error: "Producto no encontrado."
			});
		}
		const producto = resProducto.rows[0];
		// Validar stock disponible
		if (Number(producto.stock_actual) < cantidad) {
			await client.query('ROLLBACK');
			return res.status(400).json({
				error: `Stock insuficiente. Disponible: ${producto.stock_actual}`
			});
		}
		// Obtener/Congelar costo unitario y calcular costo total de la pérdida
		const costoUnitarioCongelado = Number(producto.costo_unitario) || 0.00;
		const costoTotalPerdida = cantidad * costoUnitarioCongelado;
		// Asegurar fila del mes en inventario_mensual_producto
		const queryUpsertMensual = `
            INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
            VALUES ($1, $2, $3, $4, $4)
            ON CONFLICT (anio, mes, id_producto) 
            DO UPDATE SET id_producto = EXCLUDED.id_producto
            RETURNING stock_actual;
        `;
		const resMensual = await client.query(queryUpsertMensual, [
			anio, mes, id_producto, producto.stock_actual
		]);
		if (Number(resMensual.rows[0].stock_actual) < cantidad) {
			await client.query('ROLLBACK');
			return res.status(400).json({
				error: "El stock registrado en el mes no cubre la cantidad a descontar."
			});
		}
		// Insertar movimiento GUARDANDO el costo unitario y total independientemente
		const queryMovimiento = `
            INSERT INTO movimiento_producto 
                (id_producto, anio, mes, tipo_movimiento, cantidad, costo_unitario, costo_total, observacion)
            VALUES ($1, $2, $3, 'PERDIDA', $4, $5, $6, $7)
            RETURNING *;
        `;
		const resMovimiento = await client.query(queryMovimiento, [
			id_producto,
			anio,
			mes,
			cantidad,
			costoUnitarioCongelado,
			costoTotalPerdida,
			observacion
		]);
		// Descontar del inventario mensual
		await client.query(`UPDATE inventario_mensual_producto 
             SET stock_actual = stock_actual - $1 
             WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
			[cantidad, anio, mes, id_producto]);
		// Descontar del stock global
		await client.query(`UPDATE producto 
             SET stock_actual = stock_actual - $1 
             WHERE id_producto = $2`,
			[cantidad, id_producto]);
		await client.query('COMMIT');
		return res.status(201).json({
			mensaje: "Pérdida registrada exitosamente con su costo valorizado.",
			movimiento: resMovimiento.rows[0]
		});
	} catch (error) {
		await client.query('ROLLBACK');
		console.error("Error al registrar pérdida:", error);
		return res.status(500).json({
			error: "Error interno en el servidor."
		});
	} finally {
		client.release();
	}
};
module.exports = {
	registrarPerdidaProducto
};
