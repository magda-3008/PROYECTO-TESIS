const express = require("express");
const router = express.Router();
const pool = require("../config/db");

const {
	verificarSesion
} = require("../middleware/autenticacion");

router.use(verificarSesion);

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

		if (
			id_producto === undefined ||
			id_producto === null ||
			tipo_movimiento === undefined ||
			motivo === undefined ||
			cantidad === undefined
		) {
			throw new Error("Datos incompletos.");
		}

		const idProductoNum = Number(id_producto);
		const cantidadNum = Number(cantidad);

		if (!Number.isInteger(idProductoNum) || idProductoNum <= 0) {
			throw new Error("El producto seleccionado no es válido.");
		}

		if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
			throw new Error(
				"La cantidad debe ser un número entero mayor a 0."
			);
		}

		if (tipo_movimiento !== "SALIDA") {
			throw new Error(
				"Este endpoint solo permite registrar movimientos de salida."
			);
		}

		const motivosPermitidos = [
			"PERDIDA",
			"AJUSTE",
			"OTRO"
		];

		if (!motivosPermitidos.includes(motivo)) {
			throw new Error("El motivo de salida no es válido.");
		}

		const ahora = new Date();
		const anio = ahora.getFullYear();
		const mes = ahora.getMonth() + 1;

		const resProducto = await client.query(`
            SELECT
                p.id_producto,
                p.nombre,
                p.tipo,
                p.precio_venta,
                p.stock_actual,

                pr.costo_compra,

                pe.se_elabora_al_momento

            FROM producto p

            LEFT JOIN producto_reventa pr
                ON p.id_producto = pr.id_producto

            LEFT JOIN producto_elaborado pe
                ON p.id_producto = pe.id_producto

            WHERE p.id_producto = $1

            FOR UPDATE OF p;
        `, [idProductoNum]);

		if (resProducto.rows.length === 0) {
			throw new Error("Producto no encontrado.");
		}

		const producto = resProducto.rows[0];

		if (
			producto.tipo !== "Reventa" &&
			producto.tipo !== "Elaborado"
		) {
			throw new Error("El producto tiene un tipo no válido.");
		}

		if (
			producto.tipo === "Elaborado" &&
			producto.se_elabora_al_momento === true
		) {
			throw new Error(
				"Este producto se elabora al momento y no mantiene stock de producto terminado. " +
				"Su consumo debe registrarse al realizar la venta."
			);
		}

		const stockActual = Number(producto.stock_actual || 0);

		if (cantidadNum > stockActual) {
			throw new Error(
				`Stock insuficiente. Disponible: ${stockActual}`
			);
		}

		let costoUnitario = 0;

		if (producto.tipo === "Reventa") {

			costoUnitario = Number(
				producto.costo_compra || 0
			);

		} else if (producto.tipo === "Elaborado") {

			const resCosto = await client.query(`
                SELECT costo_unitario_prod
                FROM v_productos_elaborados_costo_actual
                WHERE id_producto = $1;
            `, [idProductoNum]);

			if (resCosto.rows.length > 0) {
				costoUnitario = Number(
					resCosto.rows[0].costo_unitario_prod || 0
				);
			}
		}

		const resStock = await client.query(`
            UPDATE producto
            SET stock_actual = stock_actual - $1
            WHERE id_producto = $2
              AND stock_actual >= $1
            RETURNING stock_actual;
        `, [
			cantidadNum,
			idProductoNum
		]);

		if (resStock.rows.length === 0) {
			throw new Error(
				"No fue posible actualizar el stock. " +
				"Es posible que el stock disponible haya cambiado."
			);
		}

		const nuevoStock = Number(
			resStock.rows[0].stock_actual
		);

		const costoTotal = cantidadNum * costoUnitario;

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
            );
        `, [
			idProductoNum,
			anio,
			mes,
			tipo_movimiento,
			motivo,
			cantidadNum,
			observacion || null,
			costoUnitario,
			costoTotal
		]);

		await client.query("COMMIT");

		res.json({
			mensaje: "Salida registrada correctamente.",
			id_producto: idProductoNum,
			cantidad: cantidadNum,
			nuevo_stock_actual: nuevoStock,
			costo_unitario: costoUnitario,
			costo_total: costoTotal
		});

	} catch (error) {

		await client.query("ROLLBACK");

		console.error(
			"Error al registrar salida:",
			error
		);

		res.status(500).json({
			mensaje: error.message
		});

	} finally {
		client.release();
	}
});

module.exports = router;