const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT *
            FROM receta
            ORDER BY id_receta
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al obtener las recetas"
        });
    }
});

router.get("/", async (req, res) => {
    const { ingrediente } = req.query;

    try {
        let consultaSQL = "";
        let parametros = [];

        // Evaluamos que 'ingrediente' exista, no sea un string vacío, ni sea el texto "null"
        if (ingrediente && ingrediente !== "" && ingrediente !== "null") {
            consultaSQL = `
                SELECT DISTINCT 
                    r.id_receta, 
                    r.nombre_receta, 
                    r.imagen_url, 
                    r.cantidad_producida_base, 
                    r.descripcion
                FROM receta r
                INNER JOIN detalle_receta dr ON r.id_receta = dr.id_receta
                WHERE dr.id_ma = $1::integer OR dr.id_producto_insumo = $1::integer
                ORDER BY r.id_receta
            `;
            parametros.push(ingrediente);
        } else {
            consultaSQL = `
                SELECT *
                FROM receta
                ORDER BY id_receta
            `;
        }

        const resultado = await pool.query(consultaSQL, parametros);
        res.json(resultado.rows);

    } catch (error) {
        console.error("Error en la consulta de recetas:", error);
        res.status(500).json({
            mensaje: "Error al obtener las recetas"
        });
    }
});

module.exports = router;