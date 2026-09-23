const express = require("express");
const router = express.Router();
const pool = require("../config/db");
router.post("/", async (req, res) => {
	const client = await pool.connect();
	try {
		await client.query("BEGIN");
		const {
			id_producto,
			tipo_movimiento,
			motivo,
			cantidad,
			observacion
		} = req.body;
		// --------------------------------------------------
		// 1. VALIDACIONES BÁSICAS
		// --------------------------------------------------
		if (!id_producto || !tipo_movimiento || !motivo || cantidad === undefined) {
			throw new Error("Datos incompletos.");
		}
		const cantidadNum = Number(cantidad);
		if (isNaN(cantidadNum) || cantidadNum <= 0) {
			throw new Error("La cantidad debe ser mayor a 0.");
		}
		// --------------------------------------------------
		// 2. ESTA RUTA SOLAMENTE REGISTRA SALIDAS MANUALES
		// --------------------------------------------------
		if (tipo_movimiento !== "SALIDA") {
			throw new Error("Este endpoint solo permite registrar movimientos de salida.");
		}
		// Venta NO se permite desde este endpoint.
		// Las ventas serán registradas posteriormente
		// desde el módulo de ventas.
		const motivosPermitidos = ["PERDIDA", "AJUSTE", "OTRO"];
		if (!motivosPermitidos.includes(motivo)) {
			throw new Error("El motivo de salida no es válido.");
		}
		// --------------------------------------------------
		// 3. FECHA ACTUAL
		// --------------------------------------------------
		const ahora = new Date();
		const anio = ahora.getFullYear();
		const mes = ahora.getMonth() + 1;
		// --------------------------------------------------
		// 4. OBTENER Y BLOQUEAR EL PRODUCTO
		// --------------------------------------------------
		const resProducto = await client.query(`
            SELECT
                p.id_producto,
                p.nombre,
                p.tipo,
                p.precio_venta,

                pr.stock_actual_pr,
                pr.costo_compra,

                pe.stock_actual_pe

            FROM producto p

            LEFT JOIN producto_reventa pr
                ON p.id_producto = pr.id_producto

            LEFT JOIN producto_elaborado pe
                ON p.id_producto = pe.id_producto

            WHERE p.id_producto = $1

            FOR UPDATE OF p
            `,
			[id_producto]);
		if (resProducto.rows.length === 0) {
			throw new Error("Producto no encontrado.");
		}
		const producto = resProducto.rows[0];
		// --------------------------------------------------
		// 5. OBTENER STOCK Y COSTO ACTUAL
		// --------------------------------------------------
		let stockActual;
		let costoUnitario;
		if (producto.tipo === "Reventa") {
			stockActual = Number(producto.stock_actual_pr || 0);
			costoUnitario = Number(producto.costo_compra || 0);
		} else if (producto.tipo === "Elaborado") {
			stockActual = Number(producto.stock_actual_pe || 0);
			const resCosto = await client.query(`
                SELECT costo_unitario_prod
                FROM v_productos_elaborados_costo_actual
                WHERE id_producto = $1
                `,
				[id_producto]);
			costoUnitario = resCosto.rows.length > 0 ? Number(resCosto.rows[0].costo_unitario_prod || 0) : 0;
		} else {
			throw new Error("El producto tiene un tipo no válido.");
		}
		// --------------------------------------------------
		// 6. VALIDAR STOCK DISPONIBLE
		// --------------------------------------------------
		if (cantidadNum > stockActual) {
			throw new Error(`Stock insuficiente. Disponible: ${stockActual}`);
		}
		// --------------------------------------------------
		// 7. CALCULAR NUEVO STOCK
		// --------------------------------------------------
		const nuevoStock = stockActual - cantidadNum;
		// --------------------------------------------------
		// 8. ACTUALIZAR STOCK
		// --------------------------------------------------
		if (producto.tipo === "Reventa") {
			await client.query(`
                UPDATE producto_reventa

                SET stock_actual_pr = $1

                WHERE id_producto = $2
                `,
				[
					nuevoStock,
					id_producto
				]);
		} else {
			await client.query(`
                UPDATE producto_elaborado

                SET stock_actual_pe = $1

                WHERE id_producto = $2
                `,
				[
					nuevoStock,
					id_producto
				]);
		}
		// --------------------------------------------------
		// 9. CALCULAR COSTO DEL MOVIMIENTO
		// --------------------------------------------------
		const costoTotal = cantidadNum * costoUnitario;
		// --------------------------------------------------
		// 10. REGISTRAR MOVIMIENTO
		// --------------------------------------------------
		await client.query(`
            INSERT INTO movimiento_producto (
                id_producto,
                anio,
                mes,
                tipo_movimiento,
                motivo,
                cantidad,
                observacion,
                costo_unitario,
                costo_total
            )

            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9
            )
            `,
			[
				id_producto,
				anio,
				mes,
				tipo_movimiento,
				motivo,
				cantidadNum,
				observacion || null,
				costoUnitario,
				costoTotal
			]);
		// --------------------------------------------------
		// 11. CONFIRMAR TRANSACCIÓN
		// --------------------------------------------------
		await client.query("COMMIT");
		res.json({
			mensaje: "Salida registrada correctamente.",
			nuevo_stock_actual: nuevoStock
		});
	} catch (error) {
		await client.query("ROLLBACK");
		console.error("Error al registrar salida:", error);
		res.status(500).json({
			mensaje: error.message
		});
	} finally {
		client.release();
	}
});
module.exports = router;
