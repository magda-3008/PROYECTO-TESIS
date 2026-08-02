const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const { id_producto, tipo_movimiento, cantidad, observacion } = req.body;

        if (!id_producto || !tipo_movimiento || !cantidad || cantidad <= 0) {
            throw new Error("Datos incompletos o inválidos.");
        }

        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mes = ahora.getMonth() + 1;

        switch (tipo_movimiento) {
            case "COMPRA":
                await registrarCompra(client, id_producto, cantidad, observacion, anio, mes);
                break;
            case "PRODUCCION":
                await registrarProduccion(client, id_producto, cantidad, observacion, anio, mes);
                break;
            case "ENTRADA":
                await registrarEntrada(client, id_producto, cantidad, observacion, anio, mes);
                break;
            default:
                throw new Error("Tipo de movimiento no válido.");
        }

        await client.query("COMMIT");
        res.json({ mensaje: "Movimiento registrado correctamente." });

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error en /api/entrada:", error);
        res.status(500).json({ mensaje: error.message });
    } finally {
        client.release();
    }
});

// ---------- COMPRA ----------
async function registrarCompra(client, idProducto, cantidad, observacion, anio, mes) {
    const resProducto = await client.query(
        `SELECT tipo FROM producto WHERE id_producto = $1 FOR UPDATE`,
        [idProducto]
    );
    if (resProducto.rows.length === 0) throw new Error("Producto no encontrado.");
    if (resProducto.rows[0].tipo !== "Reventa") {
        throw new Error("El producto no es de tipo Reventa.");
    }

    const cantidadFinal = Number(cantidad);

    await client.query(
        `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
        [anio, mes, idProducto]
    );

    await client.query(
        `INSERT INTO movimiento_producto (id_producto, anio, mes, tipo_movimiento, cantidad, observacion)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idProducto, anio, mes, "COMPRA", cantidadFinal, observacion || null]
    );

    await client.query(
        `UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
        [cantidadFinal, anio, mes, idProducto]
    );
}

// ---------- PRODUCCIÓN (GUARDA LOTES, ACTUALIZA UNIDADES) ----------
async function registrarProduccion(client, idProducto, cantidadLotes, observacion, anio, mes) {
    const resProducto = await client.query(
        `SELECT tipo FROM producto WHERE id_producto = $1 FOR UPDATE`,
        [idProducto]
    );
    if (resProducto.rows.length === 0) throw new Error("Producto no encontrado.");
    if (resProducto.rows[0].tipo !== "Elaborado") {
        throw new Error("El producto no es de tipo Elaborado.");
    }

    const resReceta = await client.query(
        `SELECT cantidad_producida_base FROM receta WHERE id_producto = $1 LIMIT 1`,
        [idProducto]
    );
    if (resReceta.rows.length === 0) throw new Error("El producto no tiene receta asociada.");

    const cantidadProducidaBase = Number(resReceta.rows[0].cantidad_producida_base) || 1;
    const cantidadLotesNum = Number(cantidadLotes);
    const cantidadFinalUnidades = cantidadLotesNum * cantidadProducidaBase;

    await client.query(
        `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
        [anio, mes, idProducto]
    );

    // Guardamos la cantidad de LOTES en movimiento_producto
    await client.query(
        `INSERT INTO movimiento_producto (id_producto, anio, mes, tipo_movimiento, cantidad, observacion)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idProducto, anio, mes, "PRODUCCION", cantidadLotesNum, observacion || null]
    );

    // Actualizamos stock con las UNIDADES totales
    await client.query(
        `UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
        [cantidadFinalUnidades, anio, mes, idProducto]
    );
}

// ---------- ENTRADA (Ajuste/Otro) ----------
async function registrarEntrada(client, idProducto, cantidad, observacion, anio, mes) {
    const resProducto = await client.query(
        `SELECT id_producto FROM producto WHERE id_producto = $1 FOR UPDATE`,
        [idProducto]
    );
    if (resProducto.rows.length === 0) throw new Error("Producto no encontrado.");

    const cantidadFinal = Number(cantidad);

    await client.query(
        `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
        [anio, mes, idProducto]
    );

    await client.query(
        `INSERT INTO movimiento_producto (id_producto, anio, mes, tipo_movimiento, cantidad, observacion)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idProducto, anio, mes, "ENTRADA", cantidadFinal, observacion || null]
    );

    await client.query(
        `UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
        [cantidadFinal, anio, mes, idProducto]
    );
}

module.exports = router;