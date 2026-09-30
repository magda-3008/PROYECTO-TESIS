const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {
    convertirCantidadAUnidadMedida
} = require("../utils/conversionCantidad-a-Unidades");

const {
    convertirTextoANumero
} = require("../utils/conversionUnidades");

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
router.post("/", async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const {
            nombre,
            unidad_medida,
            costo_total_ingrediente,
            unidad_por_paquete,
            stock_actual_i,
            stock_minimo,
            unidad_existencia
        } = req.body;
        if (!nombre || !nombre.trim()) {
            return res.status(400).json({
                error: "El nombre de la materia prima es obligatorio."
            });
        }
        if (costo_total_ingrediente === undefined || Number(costo_total_ingrediente) <= 0) {
            return res.status(400).json({
                error: "El costo de la materia prima debe ser mayor que 0."
            });
        }
        if (!unidad_medida || !unidad_medida.trim()) {
            return res.status(400).json({
                error: "La unidad de medida es obligatoria."
            });
        }
        if (!unidad_existencia || !unidad_existencia.trim()) {
            return res.status(400).json({
                error: "La unidad de existencia es obligatoria."
            });
        }
        if (unidad_por_paquete === undefined || Number(unidad_por_paquete) <= 0) {
            return res.status(400).json({
                error: "La cantidad por presentación debe ser mayor que 0."
            });
        }
        if (stock_actual_i === undefined || Number(stock_actual_i) <= 0) {
            return res.status(400).json({
                error: "El stock inicial debe ser mayor que 0."
            });
        }
        if (stock_minimo === undefined || Number(stock_minimo) < 0) {
            return res.status(400).json({
                error: "El stock mínimo no puede ser negativo."
            });
        }
        const materiaPrima = {
            unidad_medida: unidad_medida.trim(),
            unidad_existencia: unidad_existencia.trim(),
            unidad_por_paquete: Number(unidad_por_paquete)
        };
        const stockInicialNormalizado = convertirCantidadAUnidadMedida(Number(stock_actual_i), materiaPrima);
        const stockMinimoNormalizado = Number(stock_minimo) === 0 ? 0 : convertirCantidadAUnidadMedida(Number(stock_minimo), materiaPrima);
        const resultado = await client.query(`
            INSERT INTO materia_prima_y_cd (
                nombre,
                unidad_medida,
                costo_total_ingrediente,
                unidad_por_paquete,
                stock_actual_i,
                stock_minimo,
                unidad_existencia
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
            `,
            [
                nombre.trim(),
                unidad_medida.trim(),
                Number(costo_total_ingrediente),
                Number(unidad_por_paquete),
                stockInicialNormalizado,
                stockMinimoNormalizado,
                unidad_existencia.trim()
            ]);
        const materiaPrimaCreada = resultado.rows[0];
        const costoUnitario = Number(costo_total_ingrediente) / Number(unidad_por_paquete);
        const costoTotal = stockInicialNormalizado * costoUnitario;
        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mes = ahora.getMonth() + 1;
        await client.query(`
            INSERT INTO movimiento_materia_prima (
                id_ma,
                anio,
                mes,
                tipo_movimiento,
                motivo,
                cantidad,
                costo_unitario,
                costo_total,
                observacion
            )
            VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9
            );
            `,
            [
                materiaPrimaCreada.id_ma,
                anio,
                mes, "ENTRADA", "COMPRA",
                stockInicialNormalizado,
                costoUnitario,
                costoTotal, "Primeras unidades insertadas del producto"
            ]);
        await client.query("COMMIT");
        res.status(201).json({
            mensaje: "Materia prima creada correctamente.",
            materiaPrima: materiaPrimaCreada
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error al crear materia prima:", error);
        res.status(500).json({
            error: error.message
        });
    } finally {
        client.release();
    }
});

router.patch("/:id", async (req, res) => {

    const client = await pool.connect();

    try {

        const { id } = req.params;

        const {
            nombre,
            costo_total_ingrediente,
            stock_minimo
        } = req.body;


        if (!id || isNaN(Number(id))) {

            return res.status(400).json({
                error:
                    "El identificador de la materia prima no es válido."
            });

        }


        if (
            nombre === undefined ||
            !String(nombre).trim()
        ) {

            return res.status(400).json({
                error:
                    "El nombre de la materia prima es obligatorio."
            });

        }


        if (
            costo_total_ingrediente === undefined ||
            Number(costo_total_ingrediente) <= 0
        ) {

            return res.status(400).json({
                error:
                    "El costo de la materia prima debe ser mayor que 0."
            });

        }


        if (stock_minimo === undefined) {

            return res.status(400).json({
                error:
                    "El stock mínimo es obligatorio."
            });

        }


        let stockMinimoHumano;

        try {

            stockMinimoHumano =
                convertirTextoANumero(stock_minimo);

        } catch (error) {

            return res.status(400).json({
                error: error.message
            });

        }


        if (
            !Number.isFinite(stockMinimoHumano) ||
            stockMinimoHumano < 0
        ) {

            return res.status(400).json({
                error:
                    "El stock mínimo no puede ser negativo."
            });

        }


        const resultadoMateriaPrima =
            await client.query(
                `
                SELECT
                    unidad_medida,
                    unidad_existencia,
                    unidad_por_paquete
                FROM materia_prima_y_cd
                WHERE id_ma = $1;
                `,
                [Number(id)]
            );


        if (resultadoMateriaPrima.rowCount === 0) {

            return res.status(404).json({
                error:
                    "La materia prima no existe."
            });

        }


        const materiaPrimaActual =
            resultadoMateriaPrima.rows[0];


        const stockMinimoNormalizado =
            stockMinimoHumano === 0
                ? 0
                : convertirCantidadAUnidadMedida(
                    stockMinimoHumano,
                    materiaPrimaActual
                );


        const resultado =
            await client.query(
                `
                UPDATE materia_prima_y_cd
                SET
                    nombre = $1,
                    costo_total_ingrediente = $2,
                    stock_minimo = $3
                WHERE id_ma = $4
                RETURNING *;
                `,
                [
                    String(nombre).trim(),
                    Number(costo_total_ingrediente),
                    stockMinimoNormalizado,
                    Number(id)
                ]
            );


        res.json({

            mensaje:
                "Materia prima actualizada correctamente.",

            materiaPrima:
                resultado.rows[0]

        });


    } catch (error) {

        console.error(
            "Error al actualizar materia prima:",
            error
        );

        res.status(500).json({
            error:
                "Error al actualizar la materia prima."
        });

    } finally {

        client.release();

    }

});

module.exports = router;
