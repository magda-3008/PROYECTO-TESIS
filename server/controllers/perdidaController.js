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
		// 1. Obtener producto maestro (solo costo_unitario, sin intentar leer stock)
		const resProducto = await client.query(`SELECT id_producto, costo_unitario 
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
		const cantidadRestar = Number(cantidad);
		// 2. Asegurar que existe la fila del mes en inventario_mensual_producto (inicia en 0 si no existe)
		await client.query(`INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
             VALUES ($1, $2, $3, 0, 0)
             ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
			[anio, mes, id_producto]);
		// 3. Consultar y bloquear el stock MENSUAL actual
		const resMensual = await client.query(`SELECT stock_actual 
             FROM inventario_mensual_producto 
             WHERE anio = $1 AND mes = $2 AND id_producto = $3 FOR UPDATE`,
			[anio, mes, id_producto]);
		const stockDisponibleMes = Number(resMensual.rows[0].stock_actual);
		// 4. Validar stock disponible en el mes
		if (stockDisponibleMes < cantidadRestar) {
			await client.query('ROLLBACK');
			return res.status(400).json({
				error: `Stock insuficiente en el período ${mes}/${anio}. Disponible: ${stockDisponibleMes}`
			});
		}
		// 5. Congelar costo unitario y calcular costo total
		const costoUnitarioCongelado = Number(producto.costo_unitario) || 0.00;
		const costoTotalPerdida = cantidadRestar * costoUnitarioCongelado;
		// 6. Registrar movimiento de pérdida
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
			cantidadRestar,
			costoUnitarioCongelado,
			costoTotalPerdida,
			observacion
		]);
		// 7. Descontar stock ÚNICAMENTE del inventario mensual
		await client.query(`UPDATE inventario_mensual_producto 
             SET stock_actual = stock_actual - $1 
             WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
			[cantidadRestar, anio, mes, id_producto]);
		await client.query('COMMIT');
		return res.status(201).json({
			mensaje: "Pérdida registrada exitosamente.",
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
