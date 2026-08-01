const pool = require('../config/db');

async function registrarProduccion(client, idProducto, cantidadLotes, observacion, anio, mes) {
    // 1. Obtener el producto (con bloqueo)
    const resProducto = await client.query(
        `SELECT id_producto, tipo, stock_actual
         FROM producto
         WHERE id_producto = $1
         FOR UPDATE`,
        [idProducto]
    );

    if (resProducto.rows.length === 0) {
        throw new Error("Producto no encontrado.");
    }

    const producto = resProducto.rows[0];

    // 2. Validar que sea "Elaborado"
    if (producto.tipo !== "Elaborado") {
        throw new Error("El producto no es de tipo Elaborado. No se puede registrar producción.");
    }

    // 3. Obtener la receta del producto (cantidad_producida_base)
    const resReceta = await client.query(
        `SELECT cantidad_producida_base
         FROM receta
         WHERE id_producto = $1
         LIMIT 1`,  // asumimos que solo hay una receta activa por producto
        [idProducto]
    );

    if (resReceta.rows.length === 0) {
        throw new Error("El producto no tiene una receta asociada. No se puede calcular la producción.");
    }

    const cantidadProducidaBase = Number(resReceta.rows[0].cantidad_producida_base) || 1;
    const cantidadFinal = cantidadLotes * cantidadProducidaBase;

    // 4. Asegurar registro mensual
    await client.query(
        `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, $4, $4)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
        [anio, mes, idProducto, producto.stock_actual]
    );

    // 5. Registrar movimiento (guardamos la cantidad en unidades)
    await client.query(
        `INSERT INTO movimiento_producto (id_producto, anio, mes, tipo_movimiento, cantidad, observacion)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idProducto, anio, mes, "PRODUCCION", cantidadFinal, observacion || null]
    );

    // 6. Actualizar stock mensual
    await client.query(
        `UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
        [cantidadFinal, anio, mes, idProducto]
    );

    // 7. Actualizar stock global
    await client.query(
        `UPDATE producto
         SET stock_actual = stock_actual + $1
         WHERE id_producto = $2`,
        [cantidadFinal, idProducto]
    );
}

module.exports = { registrarEntradaProducto };