const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {

   const { ingrediente, buscar } = req.query;

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

            condiciones.push(
                `(dr.id_ma = $${parametros.length}
                OR dr.id_producto_insumo = $${parametros.length})`
            );

        }

        if (buscar) {

            parametros.push(`%${buscar}%`);

            condiciones.push(
                `r.nombre_receta ILIKE $${parametros.length}`
            );

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

module.exports = router;