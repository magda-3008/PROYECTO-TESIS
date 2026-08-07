const express = require("express");
const router = express.Router();
const pool = require("../config/db");
router.get("/", async (req, res) => {
	const {
		ingrediente,
		buscar
	} = req.query;
	try {
		let consultaSQL = `
            SELECT DISTINCT
                r.id_receta,
                r.nombre_receta,
                r.imagen_url,
                r.cantidad_producida_base,
                r.descripcion
            FROM receta r
            INNER JOIN detalle_receta dr
                ON dr.id_receta = r.id_receta
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
router.get('/producto/:id_producto', async (req, res) => {
	const {
		id_producto
	} = req.params;
	try {
		const result = await db.query('SELECT cantidad_producida_base FROM receta WHERE id_producto = $1',
			[id_producto]);
		if (result.rows.length === 0) {
			return res.status(404).json({
				mensaje: 'El producto no posee receta registrada.'
			});
		}
		res.json(result.rows[0]);
	} catch (error) {
		res.status(500).json({
			mensaje: 'Error al consultar la receta.'
		});
	}
});
module.exports = router;
