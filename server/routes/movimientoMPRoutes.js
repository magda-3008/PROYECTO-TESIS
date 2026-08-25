const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { id_ma, tipo_movimiento, cantidad, observacion } = req.body;

        if (!id_ma || !tipo_movimiento || !cantidad || cantidad <= 0) {
            throw new Error("Datos incompletos o inválidos.");
        }

        const ahora = new Date();
        const anio = req.body.anio || ahora.getFullYear();
        const mes = req.body.mes || ahora.getMonth() + 1;

        switch (tipo_movimiento) {
            case "COMPRA":
            case "ENTRADA":
                await registrarEntrada(
                    client,
                    id_ma,
                    cantidad,
                    observacion,
                    anio,
                    mes,
                );
                break;

            default:
                throw new Error("Tipo de movimiento no válido.");
        }

        await client.query("COMMIT");
        res.json({
            mensaje: "Movimiento registrado correctamente.",
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error en /api/entradaMP:", error);
        res.status(500).json({
            mensaje: error.message,
        });
    } finally {
        client.release();
    }
});

async function registrarMovimientoEntrada(
    client,
    id_ma,
    tipo_movimiento,
    cantidad,
    observacion,
    anio,
    mes,
) {
    const resMateriaPrima = await client.query(
        `SELECT id_ma FROM materia_prima_y_cd WHERE id_ma = $1 FOR UPDATE`,
        [id_ma],
    );

    if (resMateriaPrima.rows.length === 0) {
        throw new Error("Materia prima no encontrada.");
    }

    const cantidadFinal = Number(cantidad);

    const resCosto = await client.query(
        `SELECT costo_total_ingrediente, unidad_por_paquete
         FROM materia_prima_y_cd
         WHERE id_ma = $1`,
        [id_ma],
    );

    if (resCosto.rows.length === 0) {
        throw new Error("No se encontró el costo de la materia prima.");
    }

    const costoUnitario =
        Number(resCosto.rows[0].costo_total_ingrediente || 0) /
        Number(resCosto.rows[0].unidad_por_paquete || 1);

    const costoTotal = cantidadFinal * costoUnitario;

    await client.query(
        `INSERT INTO movimiento_materia_prima
            (id_ma, anio, mes, tipo_movimiento, cantidad,
             costo_unitario, costo_total, observacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            id_ma,
            anio,
            mes,
            tipo_movimiento,
            cantidadFinal,
            costoUnitario,
            costoTotal,
            observacion || null,
        ],
    );
}

module.exports = router;
