const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// router.get("/", async (req, res) => {
//     try {
//         const resultado = await pool.query(`
//             SELECT *
//             FROM materia_prima_y_cd
//             ORDER BY nombre
//         `);

//         res.json(resultado.rows);

//     } catch (error) {
//         console.error(error);
//         res.status(500).json({
//             mensaje: "Error al obtener materia prima"
//         });
//     }
// });

router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                mp.*,
                COALESCE(
                    (
                        SELECT json_agg(
                            json_build_object(
                                'unidad_ingresada', cu.unidad_ingresada,
                                'factor_conversion', cu.factor_conversion
                            )
                            ORDER BY cu.unidad_ingresada
                        )
                        FROM conversion_unidad cu
                        WHERE cu.id_ma = mp.id_ma
                    ),
                    '[]'::json
                ) AS conversiones
            FROM materia_prima_y_cd mp
            ORDER BY mp.nombre;
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error("Error al obtener materias primas:", error);

        res.status(500).json({
            error: "Error al obtener las materias primas."
        });
    }
});

module.exports = router;