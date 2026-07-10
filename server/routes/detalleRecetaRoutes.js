const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Obtener los detalles de una receta por su ID
router.get("/:id", async (req, res) => {

    const { id } = req.params;

    try {

        const resultado = await pool.query(
            `
             SELECT
                r.id_receta,
                r.nombre_receta,
                r.cantidad_producida_base,
                r.imagen_url,
                r.descripcion

                dr.id_detalle_receta,
                dr.cantidad_utilizada

                COALESCE(mp.nombre, p.nombre) AS nombre_insumo,

                CASE
                    WHEN mp.id_ma IS NOT NULL THEN mp.unidad_medida
                    ELSE 'unidad(es)'
                END AS unidad_medida,

                CASE
                    WHEN mp.id_ma IS NOT NULL THEN 'Materia prima'
                    ELSE 'Producto elaborado'
                END AS tipo_insumo

            FROM receta r

            INNER JOIN detalle_receta dr
                ON r.id_receta = dr.id_receta

            LEFT JOIN materia_prima_y_cd mp
                ON dr.id_ma = mp.id_ma

            LEFT JOIN producto p
                ON dr.id_producto_insumo = p.id_producto

            WHERE r.id_receta = $1

            ORDER BY dr.id_detalle_receta
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