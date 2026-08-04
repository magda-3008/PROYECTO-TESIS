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
	const cantidadRestar = Number(cantidad);
	// 1. Bloquear la fila en la tabla base producto para evitar condiciones de carrera
	const resLock = await client.query(`SELECT id_producto FROM producto WHERE id_producto = $1 FOR UPDATE`,
		[idProducto]);
	if (resLock.rows.length === 0) {
		throw new Error("Producto no encontrado.");
	}
	// 2. Obtener el costo unitario actual desde la vista / JOINs
	const resCosto = await client.query(`SELECT COALESCE(v.costo_unitario_prod, pr.costo_compra, 0) AS costo_unitario
         FROM producto p
         LEFT JOIN producto_reventa pr ON p.id_producto = pr.id_producto
         LEFT JOIN v_productos_elaborados_costo_actual v ON p.id_producto = v.id_producto
         WHERE p.id_producto = $1`,
		[idProducto]);
	const costoUnitarioCongelado = Number(resCosto.rows[0]?.costo_unitario) || 0.00;
	// 3. Consultar y bloquear el registro del inventario mensual
	const resMensual = await client.query(`SELECT stock_actual 
         FROM inventario_mensual_producto 
         WHERE anio = $1 AND mes = $2 AND id_producto = $3 
         FOR UPDATE`,
		[anio, mes, idProducto]);
	if (resMensual.rows.length === 0) {
		throw new Error(`No existe un registro de inventario para el período ${mes}/${anio}.`);
	}
	const stockMesActual = Number(resMensual.rows[0].stock_actual);
	// 4. Validar disponibilidad de stock
	if (stockMesActual < cantidadRestar) {
		throw new Error(`Stock insuficiente en este período. Disponible: ${stockMesActual}`);
	}
	// 5. Registrar el movimiento de PERDIDA con el costo congelado
	const costoTotalPerdida = cantidadRestar * costoUnitarioCongelado;
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
	// 6. Restar la cantidad del stock del mes indicado
	await client.query(`UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual - $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
		[cantidadRestar, anio, mes, idProducto]);
}
module.exports = router;
