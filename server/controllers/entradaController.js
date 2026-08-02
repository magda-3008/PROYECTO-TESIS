const pool = require('../config/db');

async function registrarProduccion(client, idProducto, cantidadLotes, observacion, anio, mes) {
    // Validar producto y receta
    const resProducto = await client.query(
        `SELECT tipo FROM producto WHERE id_producto = $1 FOR UPDATE`,
        [idProducto]
    );
    if (resProducto.rows.length === 0) throw new Error("Producto no encontrado.");
    if (resProducto.rows[0].tipo !== "Elaborado") {
        throw new Error("El producto no es de tipo Elaborado. No se puede registrar producción.");
    }

    const resReceta = await client.query(
        `SELECT cantidad_producida_base FROM receta WHERE id_producto = $1 LIMIT 1`,
        [idProducto]
    );
    if (resReceta.rows.length === 0) throw new Error("El producto no tiene receta asociada.");

    const cantidadProducidaBase = Number(resReceta.rows[0].cantidad_producida_base) || 1;
    const cantidadLotesNum = Number(cantidadLotes);
    const cantidadFinalUnidades = cantidadLotesNum * cantidadProducidaBase;

    // Asegurar registro mensual (stock inicial 0, stock actual 0)
    await client.query(
        `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
        [anio, mes, idProducto]
    );

    // 🔹 Registrar movimiento GUARDANDO LA CANTIDAD DE LOTES
    await client.query(
        `INSERT INTO movimiento_producto (id_producto, anio, mes, tipo_movimiento, cantidad, observacion)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idProducto, anio, mes, "PRODUCCION", cantidadLotesNum, observacion || null]
    );

    // 🔹 Actualizar stock con las UNIDADES totales
    await client.query(
        `UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
        [cantidadFinalUnidades, anio, mes, idProducto]
    );
}

module.exports = { registrarEntradaProducto };