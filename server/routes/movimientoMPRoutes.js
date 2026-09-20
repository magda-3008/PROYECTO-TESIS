const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const {
            id_ma,
            tipo_movimiento,
            motivo,
            cantidad,
            observacion
        } = req.body;

        // ==========================================
        // VALIDACIONES
        // ==========================================

        if (
            !id_ma ||
            !tipo_movimiento ||
            !motivo ||
            !cantidad ||
            cantidad <= 0
        ) {
            throw new Error("Datos incompletos o inválidos.");
        }

        if (tipo_movimiento !== "ENTRADA") {
            throw new Error(
                "El tipo de movimiento debe ser ENTRADA."
            );
        }

        const motivosValidos = [
            "COMPRA",
            "AJUSTE",
            "OTRO"
        ];

        if (!motivosValidos.includes(motivo)) {
            throw new Error(
                "El motivo de entrada no es válido."
            );
        }

        const ahora = new Date();

        const anio =
            req.body.anio || ahora.getFullYear();

        const mes =
            req.body.mes || ahora.getMonth() + 1;


        // ==========================================
        // REGISTRAR ENTRADA
        // ==========================================

        await registrarMovimientoEntrada(
            client,
            id_ma,
            tipo_movimiento,
            motivo,
            cantidad,
            observacion,
            anio,
            mes
        );


        // ==========================================
        // CONFIRMAR TRANSACCIÓN
        // ==========================================

        await client.query("COMMIT");

        res.json({
            mensaje: "Entrada registrada correctamente."
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "Error en /api/entradaMP:",
            error
        );

        res.status(500).json({
            mensaje: error.message
        });

    } finally {

        client.release();
    }
});


async function registrarMovimientoEntrada(
    client,
    id_ma,
    tipo_movimiento,
    motivo,
    cantidad,
    observacion,
    anio,
    mes
) {

    // ==========================================
    // VERIFICAR MATERIA PRIMA
    // Y BLOQUEAR SU REGISTRO
    // ==========================================

    const resMateriaPrima = await client.query(
        `
        SELECT id_ma
        FROM materia_prima_y_cd
        WHERE id_ma = $1
        FOR UPDATE
        `,
        [id_ma]
    );

    if (resMateriaPrima.rows.length === 0) {
        throw new Error(
            "Materia prima no encontrada."
        );
    }


    const cantidadFinal = Number(cantidad);


    // ==========================================
    // OBTENER COSTO
    // ==========================================

    const resCosto = await client.query(
        `
        SELECT
            costo_total_ingrediente,
            unidad_por_paquete
        FROM materia_prima_y_cd
        WHERE id_ma = $1
        `,
        [id_ma]
    );

    if (resCosto.rows.length === 0) {
        throw new Error(
            "No se encontró el costo de la materia prima."
        );
    }


    const costoUnitario =
        Number(
            resCosto.rows[0].costo_total_ingrediente || 0
        ) /
        Number(
            resCosto.rows[0].unidad_por_paquete || 1
        );


    const costoTotal =
        cantidadFinal * costoUnitario;


    // ==========================================
    // ACTUALIZAR STOCK
    // ==========================================

    const resStock = await client.query(
        `
        UPDATE materia_prima_y_cd
        SET stock_actual_i = stock_actual_i + $1
        WHERE id_ma = $2
        RETURNING stock_actual_i
        `,
        [cantidadFinal, id_ma]
    );


    const nuevoStock =
        Number(
            resStock.rows[0].stock_actual_i
        );


    // ==========================================
    // REGISTRAR MOVIMIENTO
    // ==========================================

    await client.query(
        `
        INSERT INTO movimiento_materia_prima
            (
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
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
            id_ma,
            anio,
            mes,
            tipo_movimiento,
            motivo,
            cantidadFinal,
            costoUnitario,
            costoTotal,
            observacion || null
        ]
    );
}


module.exports = router;