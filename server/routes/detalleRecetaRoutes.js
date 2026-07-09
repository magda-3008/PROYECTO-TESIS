const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Obtener los detalles de una receta por su ID
router.get("/detalle_receta/:id", async (req, res) => {

    const { id } = req.params;

    try {

        const resultado = await pool.query(
            `
            SELECT
                id_detalle_receta,
                id_receta,
                id_ma,
                id_producto_insumo,
                cantidad_utilizada,
                descripcion
            FROM detalle_receta
            WHERE id_receta = $1
            ORDER BY id_detalle_receta
            `,
            [id]
        );

        res.json(resultado.rows);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al obtener los detalles de la receta"
        });
    }
});

module.exports = router;