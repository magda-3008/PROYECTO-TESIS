const express = require("express");
const router = express.Router();
const pool = require("../config/db");

// Registrar una venta completa
router.post("/", async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const { productos, descuento = 0 } = req.body;

        if (!Array.isArray(productos) || productos.length === 0) {
            throw new Error("Agrega al menos un producto a la venta.");
        }

        // Validar y agrupar productos repetidos
        const cantidades = new Map();

        for (const item of productos) {
            const id = Number(item.id_producto);
            const cantidad = Number(item.cantidad);

            if (
                !Number.isInteger(id) ||
                id <= 0 ||
                !Number.isInteger(cantidad) ||
                cantidad <= 0
            ) {
                throw new Error("Hay productos o cantidades no válidos.");
            }

            cantidades.set(id, (cantidades.get(id) || 0) + cantidad);
        }

        let total = 0;
        const detalles = [];

        // Bloquear y validar los productos antes de descontar existencias
        for (const [idProducto, cantidad] of cantidades) {
            const resultado = await client.query(
                `SELECT
                    p.id_producto,
                    p.nombre,
                    p.tipo,
                    p.precio_venta,
                    pr.stock_actual_pr,
                    pe.stock_actual_pe,
                    pr.costo_compra
                 FROM producto p
                 LEFT JOIN producto_reventa pr
                    ON pr.id_producto = p.id_producto
                 LEFT JOIN producto_elaborado pe
                    ON pe.id_producto = p.id_producto
                 WHERE p.id_producto = $1
                 FOR UPDATE OF p`,
                [idProducto]
            );

            if (resultado.rows.length === 0) {
                throw new Error(`No se encontró el producto ${idProducto}.`);
            }

            const producto = resultado.rows[0];

            if (!["Reventa", "Elaborado"].includes(producto.tipo)) {
                throw new Error(
                    `El tipo del producto ${producto.nombre} no es válido.`
                );
            }

            const precio = Number(producto.precio_venta);

            if (!Number.isFinite(precio) || precio < 0) {
                throw new Error(
                    `El precio de ${producto.nombre} no es válido.`
                );
            }

            const stock = Number(
                producto.tipo === "Reventa"
                    ? producto.stock_actual_pr
                    : producto.stock_actual_pe
            );

            if (!Number.isFinite(stock) || cantidad > stock) {
                throw new Error(
                    `Stock insuficiente para ${producto.nombre}. Disponible: ${stock || 0}.`
                );
            }

            const subtotal = Math.round(precio * cantidad * 100) / 100;
            total += subtotal;

            detalles.push({
                producto,
                idProducto,
                cantidad,
                precio,
                subtotal,
                stock
            });
        }

        const subtotalVenta = Math.round(total * 100) / 100;
        const descuentoNum = Number(descuento);

        if (
            !Number.isFinite(descuentoNum) ||
            descuentoNum < 0 ||
            descuentoNum > subtotalVenta
        ) {
            throw new Error("El descuento no es válido.");
        }

        total = Math.round((subtotalVenta - descuentoNum) * 100) / 100;

        // Crear encabezado de la venta
        const ventaResult = await client.query(
            `INSERT INTO venta (total)
             VALUES ($1)
             RETURNING id_venta, fecha, total`,
            [total]
        );

        const venta = ventaResult.rows[0];

        // Guardar detalles, descontar inventario y registrar movimientos
        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mes = ahora.getMonth() + 1;

        for (const detalle of detalles) {
            const {
                producto,
                idProducto,
                cantidad,
                precio,
                subtotal,
                stock
            } = detalle;

            await client.query(
                `INSERT INTO detalle_venta
                    (id_venta, id_producto, cantidad_vendida, precio_unitario)
                 VALUES ($1, $2, $3, $4)`,
                [venta.id_venta, idProducto, cantidad, precio]
            );

            const nuevoStock = stock - cantidad;

            if (producto.tipo === "Reventa") {
                await client.query(
                    `UPDATE producto_reventa
                     SET stock_actual_pr = $1
                     WHERE id_producto = $2`,
                    [nuevoStock, idProducto]
                );
            } else {
                await client.query(
                    `UPDATE producto_elaborado
                     SET stock_actual_pe = $1
                     WHERE id_producto = $2`,
                    [nuevoStock, idProducto]
                );
            }

            // Obtener el costo unitario para el movimiento de inventario
            let costoUnitario = Number(producto.costo_compra || 0);

            if (producto.tipo === "Elaborado") {
                const costoResult = await client.query(
                    `SELECT costo_unitario_prod
                     FROM v_productos_elaborados_costo_actual
                     WHERE id_producto = $1`,
                    [idProducto]
                );

                costoUnitario = Number(
                    costoResult.rows[0]?.costo_unitario_prod || 0
                );
            }

            await client.query(
                `INSERT INTO movimiento_producto (
                    id_producto,
                    anio,
                    mes,
                    tipo_movimiento,
                    cantidad,
                    observacion,
                    costo_unitario,
                    costo_total,
                    motivo
                 )
                 VALUES ($1, $2, $3, 'SALIDA', $4, $5, $6, $7, 'VENTA')`,
                [
                    idProducto,
                    anio,
                    mes,
                    cantidad,
                    `Venta #${venta.id_venta}`,
                    costoUnitario,
                    Math.round(cantidad * costoUnitario * 100) / 100
                ]
            );
        }

        await client.query("COMMIT");

        res.status(201).json({
            mensaje: "Venta registrada correctamente.",
            venta,
            detalles: detalles.map(d => ({
                id_producto: d.idProducto,
                cantidad: d.cantidad,
                precio_unitario: d.precio,
                subtotal: d.subtotal
            }))
        });
    } catch (error) {
        await client.query("ROLLBACK");

        console.error("Error al registrar venta:", error);

        res.status(400).json({
            mensaje: error.message || "No se pudo registrar la venta."
        });
    } finally {
        client.release();
    }
});

module.exports = router;