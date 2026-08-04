const express = require("express");
const router = express.Router();
const pool = require("../config/db");
router.post("/", async (req, res) => {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const {
			id_producto,
			cantidad,
			observacion,
			anio: anioReq,
			mes: mesReq
		} = req.body;
		if (!id_producto || !cantidad || cantidad <= 0) {
			throw new Error("Datos incompletos o cantidad inválida.");
		}
		// Si el frontend envía anio y mes los usa; si no, toma la fecha actual
		const ahora = new Date();
		const anio = anioReq ? Number(anioReq) : ahora.getFullYear();
		const mes = mesReq ? Number(mesReq) : ahora.getMonth() + 1;
		// Registrar la pérdida con la función auxiliar
		await registrarPerdida(client, id_producto, cantidad, observacion, anio, mes);
		await client.query("COMMIT");
		res.json({
			mensaje: "Pérdida registrada correctamente."
		});
	} catch (error) {
		await client.query("ROLLBACK");
		console.error("Error en /api/perdida:", error);
		res.status(500).json({
			mensaje: error.message
		});
	} finally {
		client.release();
	}
});
// ---------- PÉRDIDA ----------
async function registrarPerdida(client, idProducto, cantidad, observacion, anio, mes) {
	// 1. Consultar el producto con su costo_unitario y stock_actual con bloqueo FOR UPDATE
	const resProducto = await client.query(`SELECT id_producto, stock_actual, costo_unitario 
         FROM producto 
         WHERE id_producto = $1 FOR UPDATE`,
		[idProducto]);
	if (resProducto.rows.length === 0) {
		throw new Error("Producto no encontrado.");
	}
	const producto = resProducto.rows[0];
	const cantidadRestar = Number(cantidad);
	// 2. Garantizar que existe el registro en inventario_mensual_producto
	await client.query(`INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, $4, $4)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
		[anio, mes, idProducto, producto.stock_actual]);
	// 3. Consultar stock disponible en el mes para validar antes de restar
	const resMensual = await client.query(`SELECT stock_actual 
         FROM inventario_mensual_producto 
         WHERE anio = $1 AND mes = $2 AND id_producto = $3 FOR UPDATE`,
		[anio, mes, idProducto]);
	const stockMesActual = Number(resMensual.rows[0].stock_actual);
	if (stockMesActual < cantidadRestar) {
		throw new Error(`Stock insuficiente en este período. Disponible: ${stockMesActual}`);
	}
	// 4. Obtener/Congelar costos unitarios y calcular total
	const costoUnitarioCongelado = Number(producto.costo_unitario) || 0.00;
	const costoTotalPerdida = cantidadRestar * costoUnitarioCongelado;
	// 5. Registrar en movimiento_producto con el costo "congelado"
	await client.query(`INSERT INTO movimiento_producto 
            (id_producto, anio, mes, tipo_movimiento, cantidad, costo_unitario, costo_total, observacion)
         VALUES ($1, $2, $3, 'PERDIDA', $4, $5, $6, $7)`,
		[
			idProducto,
			anio,
			mes,
			cantidadRestar,
			costoUnitarioCongelado,
			costoTotalPerdida,
			observacion || null
		]);
	// 6. Restar del stock mensual
	await client.query(`UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual - $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
		[cantidadRestar, anio, mes, idProducto]);
	// 7. Restar del stock global de la tabla producto
	await client.query(`UPDATE producto
         SET stock_actual = stock_actual - $1
         WHERE id_producto = $2`,
		[cantidadRestar, idProducto]);
}
module.exports = router;
