const express = require("express");
const router = express.Router();
const pool = require("../config/db");

//
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

        if (ingrediente) {
            // Si el usuario seleccionó un ingrediente, filtramos con un JOIN
            consultaSQL = `
                SELECT DISTINCT 
                    r.id_receta, 
                    r.nombre_receta, 
                    r.imagen_url, 
                    r.cantidad_producida_base, 
                    r.descripcion
                FROM receta r
                INNER JOIN detalle_receta dr ON r.id_receta = dr.id_receta
                WHERE dr.id_ma = $1 OR dr.id_producto_insumo = $1
                ORDER BY r.id_receta
            `;
            parametros.push(ingrediente);
        } else {
            // Si no hay filtro, mantiene tu consulta original intacta
            consultaSQL = `
                SELECT *
                FROM receta
                ORDER BY id_receta
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