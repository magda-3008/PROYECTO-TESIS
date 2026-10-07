const express = require("express");
const router = express.Router();
const pool = require("../config/db");

const {
	convertirCantidad,
	convertirTextoANumero
} = require("../utils/conversionUnidades");

const {
	verificarSesion,
	verificarAdministrador
} = require("../middleware/autenticacion");

router.use(verificarSesion);

router.get("/", async (req, res) => {
	const {
		ingrediente,
		buscar
	} = req.query;
	try {
		let consultaSQL = `
            SELECT DISTINCT
                r.id_receta,
				r.id_producto,
                r.nombre_receta,
                p.foto_producto AS imagen_url,
                r.cantidad_producida_base,
                r.descripcion
            FROM receta r
            INNER JOIN detalle_receta dr
                ON dr.id_receta = r.id_receta
            LEFT JOIN producto p
                ON p.id_producto = r.id_producto
        `;
		let condiciones = [];
		let parametros = [];
		if (ingrediente) {
			parametros.push(Number(ingrediente));
			condiciones.push(`(dr.id_ma = $${parametros.length}
                OR dr.id_producto_insumo = $${parametros.length})`);
		}
		if (buscar) {
			parametros.push(`%${buscar}%`);
			condiciones.push(`r.nombre_receta ILIKE $${parametros.length}`);
		}
		if (condiciones.length > 0) {
			consultaSQL += `
                WHERE
                ${condiciones.join(" AND ")}
            `;
		}
		consultaSQL += `
            ORDER BY r.id_receta;
        `;
		const resultado = await pool.query(consultaSQL, parametros);
		res.json(resultado.rows);
	} catch (error) {
		console.error(error);
		res.status(500).json({
			mensaje: "Error al obtener las recetas"
		});
	}
});
//Buscar cantidad producida base de una receta para el modal de entradas
router.get("/producto/:id_producto", async (req, res) => {
	const {
		id_producto
	} = req.params;
	try {
		const resultado = await pool.query("SELECT cantidad_producida_base FROM receta WHERE id_producto = $1",
			[id_producto]);
		if (resultado.rows.length === 0) {
			return res.json({
				cantidad_producida_base: null,
				mensaje: "Producto sin receta"
			});
		}
		return res.json(resultado.rows[0]);
	} catch (error) {
		// Imprime el detalle exacto en la consola de Node / Render
		console.error("Error SQL en recetasRoutes:", error);
		return res.status(500).json({
			mensaje: "Error interno del servidor",
			error_sql: error.message
		});
	}
});

//Editar receta
router.put("/:id", verificarAdministrador, async (req, res) => {
	const {
		id
	} = req.params;
	const {
		nombre_receta,
		cantidad_producida_base,
		descripcion,
		ingredientes
	} = req.body;
	const idReceta = Number(id);
	if (!Number.isInteger(idReceta) || idReceta <= 0) {
		return res.status(400).json({
			mensaje: "El ID de la receta no es válido."
		});
	}
	if (typeof nombre_receta !== "string" || !nombre_receta.trim()) {
		return res.status(400).json({
			mensaje: "El nombre de la receta es obligatorio."
		});
	}
	const nombreReceta = nombre_receta.trim();
	if (nombreReceta.length > 100) {
		return res.status(400).json({
			mensaje: "El nombre de la receta no puede superar los 100 caracteres."
		});
	}
	const cantidadBase = Number(cantidad_producida_base);
	if (!Number.isInteger(cantidadBase) || cantidadBase <= 0) {
		return res.status(400).json({
			mensaje: "La cantidad producida base debe ser un número entero mayor que cero."
		});
	}
	if (descripcion !== null && descripcion !== undefined && typeof descripcion !== "string") {
		return res.status(400).json({
			mensaje: "La descripción no es válida."
		});
	}
	const descripcionReceta = descripcion === null || descripcion === undefined ? null : descripcion.trim();
	if (!Array.isArray(ingredientes) || ingredientes.length === 0) {
		return res.status(400).json({
			mensaje: "La receta debe contener al menos un ingrediente."
		});
	}
	const cliente = await pool.connect();
	try {
		await cliente.query("BEGIN");
		const recetaResultado = await cliente.query(`
            SELECT
                id_receta,
                id_producto
            FROM receta
            WHERE id_receta = $1
            FOR UPDATE
            `,
			[idReceta]);
		if (recetaResultado.rows.length === 0) {
			await cliente.query("ROLLBACK");
			return res.status(404).json({
				mensaje: "La receta no existe."
			});
		}
		const idProductoReceta = recetaResultado.rows[0].id_producto;
		const detallesPreparados = [];
		for (const ingrediente of ingredientes) {
			if (!ingrediente || typeof ingrediente !== "object") {
				throw new Error("Uno de los ingredientes no tiene un formato válido.");
			}
			const {
				tipo,
				id_ma,
				id_producto_insumo,
				cantidad,
				unidad
			} = ingrediente;
			if (cantidad === undefined || cantidad === null || String(cantidad).trim() === "") {
				throw new Error("Todos los ingredientes deben tener una cantidad.");
			}
			if (typeof unidad !== "string" || !unidad.trim()) {
				throw new Error("Todos los ingredientes deben tener una unidad.");
			}
			if (tipo === "materia_prima") {
				const idMa = Number(id_ma);
				if (!Number.isInteger(idMa) || idMa <= 0) {
					throw new Error("El ingrediente de materia prima no es válido.");
				}
				const conversion = await convertirCantidad(cliente, idMa, cantidad, unidad.trim());
				detallesPreparados.push({
					id_ma: idMa,
					id_producto_insumo: null,
					cantidad_utilizada: conversion.cantidadUtilizada,
					cantidad_ingresada: conversion.cantidadIngresada,
					unidad_ingresada: conversion.unidadIngresada
				});
			} else if (tipo === "producto") {
				const idProductoInsumo = Number(id_producto_insumo);
				if (!Number.isInteger(idProductoInsumo) || idProductoInsumo <= 0) {
					throw new Error("El producto elaborado utilizado como ingrediente no es válido.");
				}
				if (idProductoInsumo === Number(idProductoReceta)) {
					throw new Error("Un producto no puede utilizarse a sí mismo como ingrediente.");
				}
				const productoResultado = await cliente.query(`
                        SELECT
                            id_producto,
                            nombre,
                            tipo
                        FROM producto
                        WHERE id_producto = $1
                        `,
					[idProductoInsumo]);
				if (productoResultado.rows.length === 0) {
					throw new Error("El producto elaborado seleccionado no existe.");
				}
				if (productoResultado.rows[0].tipo !== "Elaborado") {
					throw new Error("Solo se pueden utilizar productos elaborados como ingredientes.");
				}
				const cantidadNumero = convertirTextoANumero(cantidad);
				if (!Number.isFinite(cantidadNumero) || cantidadNumero <= 0) {
					throw new Error(`La cantidad del producto "${productoResultado.rows[0].nombre}" no es válida.`);
				}
				detallesPreparados.push({
					id_ma: null,
					id_producto_insumo: idProductoInsumo,
					cantidad_utilizada: cantidadNumero,
					cantidad_ingresada: String(cantidad).trim(),
					unidad_ingresada: unidad.trim()
				});
			} else {
				throw new Error("Uno de los ingredientes tiene un tipo no válido.");
			}
		}
		await cliente.query(`
            UPDATE receta
            SET
                nombre_receta = $1,
                cantidad_producida_base = $2,
                descripcion = $3
            WHERE id_receta = $4
            `,
			[
				nombreReceta,
				cantidadBase,
				descripcionReceta,
				idReceta
			]);
		await cliente.query(`
            DELETE FROM detalle_receta
            WHERE id_receta = $1
            `,
			[idReceta]);
		for (const detalle of detallesPreparados) {
			await cliente.query(`
                INSERT INTO detalle_receta (
                    id_receta,
                    id_ma,
                    id_producto_insumo,
                    cantidad_utilizada,
                    cantidad_ingresada,
                    unidad_ingresada
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                `,
				[
					idReceta,
					detalle.id_ma,
					detalle.id_producto_insumo,
					detalle.cantidad_utilizada,
					detalle.cantidad_ingresada,
					detalle.unidad_ingresada
				]);
		}
		await cliente.query("COMMIT");
		return res.status(200).json({
			mensaje: "Receta actualizada correctamente.",
			id_receta: idReceta
		});
	} catch (error) {
		await cliente.query("ROLLBACK");
		console.error("Error al actualizar receta:", error);
		return res.status(400).json({
			mensaje: error.message || "No fue posible actualizar la receta."
		});
	} finally {
		cliente.release();
	}
});
module.exports = router;
