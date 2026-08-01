const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Ruta principal
router.post("/", async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const { id_producto, tipo_movimiento, cantidad, observacion } = req.body;

        // Validaciones básicas
        if (!id_producto || !tipo_movimiento || !cantidad || cantidad <= 0) {
            throw new Error("Datos incompletos o inválidos.");
        }

        // Obtener año y mes actuales (automáticamente)
        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mes = ahora.getMonth() + 1; // 1-12

        // Ejecutar la función según el tipo
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

// ---------- FUNCIÓN PARA COMPRA ----------
async function registrarCompra(client, idProducto, cantidad, observacion, anio, mes) {
    // 1. Obtener el producto (solo para validar tipo)
    const resProducto = await client.query(
        `SELECT tipo FROM producto WHERE id_producto = $1 FOR UPDATE`,
        [idProducto]
    );

    if (resProducto.rows.length === 0) {
        throw new Error("Producto no encontrado.");
    }

    const producto = resProducto.rows[0];

    // 2. Validar que sea "Reventa"
    if (producto.tipo !== "Reventa") {
        throw new Error("El producto no es de tipo Reventa. No se puede registrar una compra.");
    }

    const cantidadFinal = Number(cantidad);

    // 3. Asegurar que exista el registro mensual (crea con stock 0 si no existe)
    await client.query(
        `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
        [anio, mes, idProducto]
    );

    // 4. Registrar movimiento
    await client.query(
        `INSERT INTO movimiento_producto (id_producto, anio, mes, tipo_movimiento, cantidad, observacion)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idProducto, anio, mes, "COMPRA", cantidadFinal, observacion || null]
    );

    // 5. Actualizar stock mensual (sumando la cantidad)
    await client.query(
        `UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
        [cantidadFinal, anio, mes, idProducto]
    );
}

// ---------- FUNCIÓN PARA PRODUCCIÓN ----------
async function registrarProduccion(client, idProducto, cantidadLotes, observacion, anio, mes) {
    // 1. Obtener producto y su receta
    const resProducto = await client.query(
        `SELECT tipo FROM producto WHERE id_producto = $1 FOR UPDATE`,
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

    // 3. Obtener la receta (cantidad_producida_base)
    const resReceta = await client.query(
        `SELECT cantidad_producida_base
         FROM receta
         WHERE id_producto = $1
         LIMIT 1`,
        [idProducto]
    );

    if (resReceta.rows.length === 0) {
        throw new Error("El producto no tiene una receta asociada.");
    }

    const cantidadProducidaBase = Number(resReceta.rows[0].cantidad_producida_base) || 1;
    const cantidadFinal = cantidadLotes * cantidadProducidaBase;

    // 4. Asegurar registro mensual
    await client.query(
        `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
        [anio, mes, idProducto]
    );

    // 5. Registrar movimiento
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
}

// ---------- FUNCIÓN PARA ENTRADA (Ajuste/Otro) ----------
async function registrarEntrada(client, idProducto, cantidad, observacion, anio, mes) {
    // 1. Verificar que el producto exista
    const resProducto = await client.query(
        `SELECT id_producto FROM producto WHERE id_producto = $1 FOR UPDATE`,
        [idProducto]
    );

    if (resProducto.rows.length === 0) {
        throw new Error("Producto no encontrado.");
    }

    const cantidadFinal = Number(cantidad);

    // 2. Asegurar registro mensual
    await client.query(
        `INSERT INTO inventario_mensual_producto (anio, mes, id_producto, stock_inicial, stock_actual)
         VALUES ($1, $2, $3, 0, 0)
         ON CONFLICT (anio, mes, id_producto) DO NOTHING`,
        [anio, mes, idProducto]
    );

    // 3. Registrar movimiento
    await client.query(
        `INSERT INTO movimiento_producto (id_producto, anio, mes, tipo_movimiento, cantidad, observacion)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [idProducto, anio, mes, "ENTRADA", cantidadFinal, observacion || null]
    );

    // 4. Actualizar stock mensual
    await client.query(
        `UPDATE inventario_mensual_producto
         SET stock_actual = stock_actual + $1
         WHERE anio = $2 AND mes = $3 AND id_producto = $4`,
        [cantidadFinal, anio, mes, idProducto]
    );
}

module.exports = router;