const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT *
            FROM v_productos_inventario
            ORDER BY id_producto;
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al obtener los productos"
        });
    }
});

router.get("/analisis", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT *
            FROM v_productos_elaborados_costo_actual
            ORDER BY id_producto;
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