const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {
    convertirCantidadAUnidadMedida
} = require("../utils/conversionCantidad-a-Unidades");
const {
    verificarSesion
} = require("../middleware/autenticacion");
router.use(verificarSesion);
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
        if (!id_ma || !tipo_movimiento || !motivo || !cantidad || cantidad <= 0) {
            throw new Error("Datos incompletos o inválidos.");
        }
        if (tipo_movimiento !== "ENTRADA") {
            throw new Error("El tipo de movimiento debe ser ENTRADA.");
        }
        const motivosValidos = ["COMPRA", "AJUSTE", "OTRO"];
        if (!motivosValidos.includes(motivo)) {
            throw new Error("El motivo de entrada no es válido.");
        }
        const ahora = new Date();
        const anio = req.body.anio || ahora.getFullYear();
        const mes = req.body.mes || ahora.getMonth() + 1;
        const resultado = await registrarMovimientoEntrada(client, id_ma, tipo_movimiento, motivo, cantidad, observacion, anio, mes);
        await client.query("COMMIT");
        res.json({
            mensaje: "Entrada registrada correctamente.",
            ...resultado
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error en /api/entradaMP:", error);
        res.status(500).json({
            mensaje: error.message
        });
    } finally {
        client.release();
    }
});
async function registrarMovimientoEntrada(client, id_ma, tipo_movimiento, motivo, cantidad, observacion, anio, mes) {
    const resMateriaPrima = await client.query(`
        SELECT
            id_ma,
            nombre,
            estado_mp,
            costo_total_ingrediente,
            unidad_por_paquete,
            unidad_medida,
            unidad_existencia
        FROM materia_prima_y_cd
        WHERE id_ma = $1
        FOR UPDATE
        `,
        [id_ma]);
    if (resMateriaPrima.rows.length === 0) {
        throw new Error("Materia prima no encontrada.");
    }
    const materiaPrima = resMateriaPrima.rows[0];
    if (materiaPrima.estado_mp !== "Activo") {
        throw new Error(`No se puede registrar la entrada porque la materia prima "${materiaPrima.nombre}" está inactiva.`);
    }
    const cantidadFinal = convertirCantidadAUnidadMedida(cantidad, materiaPrima);
    const costoUnitario = Number(materiaPrima.costo_total_ingrediente || 0) / Number(materiaPrima.unidad_por_paquete || 1);
    const costoTotal = cantidadFinal * costoUnitario;
    const resStock = await client.query(`
        UPDATE materia_prima_y_cd
        SET stock_actual_i = stock_actual_i + $1
        WHERE id_ma = $2
        RETURNING stock_actual_i
        `,
        [
            cantidadFinal,
            id_ma
        ]);
    const nuevoStock = Number(resStock.rows[0].stock_actual_i);
    await client.query(`
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
        (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9
        )
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
        ]);
    return {
        nuevoStock,
        cantidadNormalizada: cantidadFinal,
        costoUnitario,
        costoTotal
    };
}
module.exports = router;
