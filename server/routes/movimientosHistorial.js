const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Obtener historial de movimientos de un producto
router.get("/:id_producto", async (req, res) => {
    const { id_producto } = req.params; // 

    try {
        const resultado = await pool.query(
            `
            SELECT
                mp.id_movimiento,
                p.nombre AS producto,
                mp.fecha,
                mp.anio,
                mp.mes,
                mp.tipo_movimiento,
                mp.cantidad,
                mp.observacion
            FROM movimiento_producto mp
            INNER JOIN producto p ON p.id_producto = mp.id_producto
            WHERE mp.id_producto = $1
            ORDER BY mp.fecha DESC, mp.id_movimiento DESC
            `,
            [id_producto]
        );

        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener historial:", error);
        res.status(500).json({
            mensaje: "Error al obtener el historial del producto."
        });
    }
});

module.exports = router;