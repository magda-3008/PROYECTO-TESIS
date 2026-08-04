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
		const resProducto = await client.query(`SELECT id_producto, stock_actual 
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
		// Validar que haya suficiente stock global
		if (Number(producto.stock_actual) < cantidad) {
			await client.query('ROLLBACK');
			return res.status(400).json({
				error: `Stock insuficiente. Disponible: ${producto.stock_actual}`
			});
		}
		const queryUpsertInventarioMensual = `
            INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
            VALUES ($1, $2, $3, $4, $4)
            ON CONFLICT (anio, mes, id_producto) 
            DO UPDATE SET id_producto = EXCLUDED.id_producto
            RETURNING stock_actual;
        `;
		const resMensualPrevio = await client.query(queryUpsertInventarioMensual, [
			anio,
			mes,
			id_producto,
			producto.stock_actual
		]);
		// Validar stock en el mes seleccionado
		if (Number(resMensualPrevio.rows[0].stock_actual) < cantidad) {
			await client.query('ROLLBACK');
			return res.status(400).json({
				error: "El stock mensual registrado no es suficiente para cubrir la pérdida."
			});
		}
		// Registrar el movimiento de PERDIDA
		const queryMovimiento = `
            INSERT INTO movimiento_producto 
                (id_producto, anio, mes, tipo_movimiento, cantidad, observacion)
            VALUES ($1, $2, $3, 'PERDIDA', $4, $5)
            RETURNING *;
        `;
		const resMovimiento = await client.query(queryMovimiento, [
			id_producto,
			anio,
			mes,
			cantidad,
			observacion
		]);
		// Restar stock del mes actual
		const queryUpdateStockMensual = `
            UPDATE inventario_mensual_producto 
            SET stock_actual = stock_actual - $1 
            WHERE anio = $2 AND mes = $3 AND id_producto = $4
            RETURNING stock_actual;
        `;
		const resStockMensual = await client.query(queryUpdateStockMensual, [
			cantidad,
			anio,
			mes,
			id_producto
		]);
		// Restar stock global del producto
		const queryUpdateStockGlobal = `
            UPDATE producto 
            SET stock_actual = stock_actual - $1 
            WHERE id_producto = $2;
        `;
		await client.query(queryUpdateStockGlobal, [cantidad, id_producto]);
		await client.query('COMMIT');
		return res.status(201).json({
			mensaje: "Pérdida registrada exitosamente.",
			movimiento: resMovimiento.rows[0],
			stock_mes_actual: resStockMensual.rows[0].stock_actual
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
