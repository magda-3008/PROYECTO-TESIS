const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {
    convertirCantidadAUnidadMedida
} = require("../utils/conversionCantidad-a-Unidades");
const {
    convertirTextoANumero
} = require("../utils/conversionUnidades");

const {
    verificarSesion,
    verificarAdministrador
} = require("../middleware/autenticacion");
router.use(verificarSesion);

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
        // El stock inicial continúa siendo obligatorio
        // y NO acepta fracciones textuales.
        if (stock_actual_i === undefined || Number(stock_actual_i) <= 0) {
            return res.status(400).json({
                error: "El stock inicial debe ser mayor que 0."
            });
        }
        let stockMinimoNumero = null;
        // El stock mínimo es opcional.
        if (stock_minimo !== undefined && stock_minimo !== null && stock_minimo !== "") {
            stockMinimoNumero = Number(stock_minimo);
            if (!Number.isFinite(stockMinimoNumero) || stockMinimoNumero < 0) {
                return res.status(400).json({
                    error: "El stock mínimo debe ser mayor o igual a 0."
                });
            }
        }
        const materiaPrima = {
            unidad_medida: unidad_medida.trim(),
            unidad_existencia: unidad_existencia.trim(),
            unidad_por_paquete: Number(unidad_por_paquete)
        };
        const stockInicialNormalizado = convertirCantidadAUnidadMedida(Number(stock_actual_i), materiaPrima);
        let stockMinimoNormalizado = null;
        if (stockMinimoNumero !== null) {
            if (stockMinimoNumero === 0) {
                stockMinimoNormalizado = 0;
            } else {
                stockMinimoNormalizado = convertirCantidadAUnidadMedida(stockMinimoNumero, materiaPrima);
            }
        }
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
        `, [
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
        `, [
            materiaPrimaCreada.id_ma,
            anio,
            mes, "ENTRADA", "COMPRA",
            stockInicialNormalizado,
            costoUnitario,
            costoTotal, "Primeras unidades insertadas del insumo"
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

//Actualizar parcialmente una materia prima
router.patch("/:id", verificarAdministrador, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        if (!id || isNaN(Number(id))) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                error: "El identificador de la materia prima no es válido."
            });
        }

        const materiaPrimaResult = await client.query(
            `
                SELECT
                    id_ma,
                    unidad_medida,
                    unidad_existencia,
                    unidad_por_paquete,
                    estado_mp
                FROM materia_prima_y_cd
                WHERE id_ma = $1;
            `,
            [Number(id)]
        );

        if (materiaPrimaResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                error: "Materia prima no encontrada."
            });
        }

        const materiaPrimaActual = materiaPrimaResult.rows[0];

        const camposPermitidos = [
            "nombre",
            "costo_total_ingrediente",
            "stock_minimo",
            "estado_mp"
        ];

        const camposAActualizar = Object.keys(updates)
            .filter(campo => camposPermitidos.includes(campo));

        if (updates.nombre !== undefined) {
            if (!String(updates.nombre).trim()) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: "El nombre de la materia prima es obligatorio."
                });
            }

            updates.nombre = String(updates.nombre).trim();
        }

        if (updates.costo_total_ingrediente !== undefined) {
            const costo = Number(updates.costo_total_ingrediente);

            if (!Number.isFinite(costo) || costo <= 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: "El costo de la materia prima debe ser mayor que 0."
                });
            }

            updates.costo_total_ingrediente = costo;
        }

        if (updates.stock_minimo !== undefined) {
            let stockMinimoHumano;

            try {
                stockMinimoHumano = convertirTextoANumero(
                    updates.stock_minimo
                );
            } catch (error) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: error.message
                });
            }

            if (
                !Number.isFinite(stockMinimoHumano) ||
                stockMinimoHumano < 0
            ) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: "El stock mínimo no puede ser negativo."
                });
            }

            updates.stock_minimo =
                stockMinimoHumano === 0
                    ? 0
                    : convertirCantidadAUnidadMedida(
                        stockMinimoHumano,
                        materiaPrimaActual
                    );
        }

        if (updates.estado_mp !== undefined) {
            const estadosPermitidos = ["Activo", "Inactivo"];

            if (!estadosPermitidos.includes(updates.estado_mp)) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: "El estado de la materia prima no es válido."
                });
            }
        }

        if (camposAActualizar.length > 0) {

            const setClause = camposAActualizar
                .map((campo, index) => `${campo} = $${index + 1}`)
                .join(", ");

            const valores = camposAActualizar.map(
                campo => updates[campo]
            );

            valores.push(Number(id));

            await client.query(
                `
                    UPDATE materia_prima_y_cd
                    SET ${setClause}
                    WHERE id_ma = $${valores.length};
                `,
                valores
            );
        }

        const materiaPrimaActualizada = await client.query(
            `
                SELECT *
                FROM materia_prima_y_cd
                WHERE id_ma = $1;
            `,
            [Number(id)]
        );

        await client.query("COMMIT");

        res.json({
            mensaje: "Materia prima actualizada correctamente.",
            materiaPrima: materiaPrimaActualizada.rows[0]
        });

    } catch (error) {
        await client.query("ROLLBACK");

        console.error(
            "Error al actualizar materia prima:",
            error
        );

        res.status(500).json({
            error: "Error interno al actualizar la materia prima."
        });

    } finally {
        client.release();
    }
});

module.exports = router;
