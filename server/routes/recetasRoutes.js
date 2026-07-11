const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {

    const { ingrediente } = req.query;

    try {

        let consultaSQL;
        let parametros = [];

        if (ingrediente) {

            consultaSQL = `
                SELECT DISTINCT
                    r.id_receta,
                    r.nombre_receta,
                    r.imagen_url,
                    r.cantidad_producida_base,
                    r.descripcion
                FROM receta r
                INNER JOIN detalle_receta dr
                    ON dr.id_receta = r.id_receta
                WHERE dr.id_ma = $1
                   OR dr.id_producto_insumo = $1
                ORDER BY r.id_receta;
            `;

            parametros.push(Number(ingrediente));

        } else {

            consultaSQL = `
                SELECT *
                FROM receta
                ORDER BY id_receta;
            `;

        }

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