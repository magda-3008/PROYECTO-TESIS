const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Obtener períodos de inventario
router.get("/periodos", async (req, res) => {

    try {

        const resultado = await pool.query(`
            SELECT
                anio,
                mes
            FROM inventario_mensual_producto
            GROUP BY anio, mes
            ORDER BY anio DESC, mes DESC;
        `);

        res.json(resultado.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Error al obtener los períodos."
        });

    }

});

router.get("/", async (req, res) => {
    const { anio, mes } = req.query;

    try {

        const resultado = await pool.query(
            `
            SELECT *
            FROM v_productos_inventario_periodo
            WHERE anio = $1
              AND mes = $2
            ORDER BY nombre;
            `,
            [anio, mes]
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Error al obtener los productos."
        });

    }
});

router.get("/analisis", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT *
            FROM v_productos_elaborados_costo_actual
            ORDER BY nombre_producto;
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al obtener los productos"
        });
    }
});


module.exports = router;