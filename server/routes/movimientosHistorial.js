const express = require("express");
const router = express.Router();
const pool = require("../config/db");
// Obtener historial de movimientos de un producto
router.get("/:id_producto", async (req, res) => {
	const {
		id_producto
	} = req.params;
	try {
		const consulta = `
            SELECT
                mp.id_movimiento,
                p.nombre AS producto,
                mp.fecha,
                mp.tipo_movimiento,
                mp.motivo,
                mp.cantidad,
                mp.costo_unitario,
                mp.costo_total,
                mp.observacion

            FROM movimiento_producto mp

            INNER JOIN producto p
                ON p.id_producto = mp.id_producto

            WHERE mp.id_producto = $1

            ORDER BY
                mp.fecha DESC,
                mp.id_movimiento DESC
        `;
		const resultado = await pool.query(consulta,
			[id_producto]);
		res.json(resultado.rows);
	} catch (error) {
		console.error("Error al obtener historial:", error);
		res.status(500).json({
			mensaje: "Error al obtener el historial del producto."
		});
	}
});

router.get("/periodos/:id_ma", async (req, res) => {
	const {
		id_ma
	} = req.params;
	try {
		const consulta = `
            SELECT DISTINCT
                anio,
                mes
            FROM movimiento_materia_prima
            WHERE id_ma = $1
            ORDER BY anio DESC, mes DESC
        `;
		const resultado = await pool.query(consulta,
			[id_ma]);
		res.json(resultado.rows);
	} catch (error) {
		console.error("Error al obtener períodos de materia prima:", error);
		res.status(500).json({
			mensaje: "Error al obtener los períodos de movimientos."
		});
	}
});

// Obtener historial de movimientos de materia prima
router.get("/:id_ma", async (req, res) => {
	const {
		id_ma
	} = req.params;
	const {
		anio,
		mes
	} = req.query;
	try {
		let consulta = `
            SELECT
                mp.id_movimiento,
                m.nombre AS materia_prima,
                mp.fecha,
                mp.anio,
                mp.mes,
                mp.tipo_movimiento,
                mp.cantidad,
                mp.costo_unitario,
                mp.costo_total,
                mp.observacion
            FROM movimiento_materia_prima mp
            INNER JOIN materia_prima_y_cd m
                ON m.id_ma = mp.id_ma
            WHERE mp.id_ma = $1
        `;
		const parametros = [id_ma];
		if (anio && mes) {
			consulta += `
                AND mp.anio = $2
                AND mp.mes = $3
            `;
			parametros.push(anio, mes);
		}
		consulta += `
            ORDER BY mp.fecha DESC, mp.id_movimiento DESC
        `;
		const resultado = await pool.query(consulta, parametros);
		res.json(resultado.rows);
	} catch (error) {
		console.error("Error al obtener historial de materia prima:", error);
		res.status(500).json({
			mensaje: "Error al obtener el historial de la materia prima."
		});
	}
});
module.exports = router;
