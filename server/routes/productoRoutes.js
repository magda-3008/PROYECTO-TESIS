const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
              SELECT
            p.id_producto,
            p.nombre,
            p.tipo,
            p.precio_venta,
            p.margen_gananciab_esperado,
            p.estado,
            COALESCE(pe.stock_actual_pe, pr.stock_actual_pr) AS stock_actual
        FROM producto p
        LEFT JOIN producto_elaborado pe
            ON p.id_producto = pe.id_producto
        LEFT JOIN producto_reventa pr
            ON p.id_producto = pr.id_producto
        ORDER BY p.id_producto;
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