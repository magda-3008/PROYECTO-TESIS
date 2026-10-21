const express = require("express");
const router = express.Router();
const pool = require("../config/db");

//Registrar una venta
router.post("/", async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const {
            productos,
            descuento = 0
        } = req.body;
        if (!Array.isArray(productos) || productos.length === 0) {
            throw new Error("Agrega al menos un producto a la venta.");
        }

        const cantidades = new Map();
        for (const item of productos) {
            const id = Number(item.id_producto);
            const cantidad = Number(item.cantidad);
            if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(cantidad) || cantidad <= 0) {
                throw new Error("Hay productos o cantidades no válidos.");
            }
            cantidades.set(id,
                (cantidades.get(id) || 0) + cantidad);
        }
        let total = 0;
        const detalles = [];

        for (const [idProducto, cantidad] of cantidades) {
            const resultado = await client.query(`
                SELECT
                    p.id_producto,
                    p.nombre,
                    p.tipo,
                    p.precio_venta,
                    p.stock_actual,
                    pr.costo_compra,
                    pe.se_elabora_al_momento
                FROM producto p

                LEFT JOIN producto_reventa pr
                    ON pr.id_producto = p.id_producto

                LEFT JOIN producto_elaborado pe
                    ON pe.id_producto = p.id_producto

                WHERE p.id_producto = $1

                FOR UPDATE OF p
                `,
                [idProducto]);
            if (resultado.rows.length === 0) {
                throw new Error(`No se encontró el producto ${idProducto}.`);
            }
            const producto = resultado.rows[0];

            if (!["Reventa", "Elaborado"].includes(producto.tipo)) {
                throw new Error(`El tipo del producto ${producto.nombre} no es válido.`);
            }

            const precio = Number(producto.precio_venta);
            if (!Number.isFinite(precio) || precio < 0) {
                throw new Error(`El precio de ${producto.nombre} no es válido.`);
            }

            const stock = Number(producto.stock_actual || 0);
            if (!Number.isFinite(stock) || cantidad > stock) {
                throw new Error(`Stock insuficiente para ${producto.nombre}. Disponible: ${stock || 0}.`);
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
        if (!Number.isFinite(descuentoNum) || descuentoNum < 0 || descuentoNum > subtotalVenta) {
            throw new Error("El descuento no es válido.");
        }
        total = Math.round(
            (subtotalVenta - descuentoNum) * 100) / 100;

        const ventaResult = await client.query(`
            INSERT INTO venta (total)
            VALUES ($1)
            RETURNING id_venta, fecha, total
            `,
            [total]);
        const venta = ventaResult.rows[0];

        const ahora = new Date();
        const anio = ahora.getFullYear();
        const mes = ahora.getMonth() + 1;

        for (const detalle of detalles) {
            const {
                producto,
                idProducto,
                cantidad,
                precio
            } = detalle;

            await client.query(`
                INSERT INTO detalle_venta
                    (
                        id_venta,
                        id_producto,
                        cantidad_vendida,
                        precio_unitario
                    )
                VALUES ($1, $2, $3, $4)
                `,
                [
                    venta.id_venta,
                    idProducto,
                    cantidad,
                    precio
                ]);

            const resultadoStock = await client.query(`
                UPDATE producto
                SET stock_actual = stock_actual - $1
                WHERE id_producto = $2
                  AND stock_actual >= $1
                RETURNING stock_actual
                `,
                [
                    cantidad,
                    idProducto
                ]);
            if (resultadoStock.rows.length === 0) {
                throw new Error(`No fue posible descontar el stock de ${producto.nombre}.`);
            }
            const nuevoStock = Number(resultadoStock.rows[0].stock_actual);

            let costoUnitario = Number(producto.costo_compra || 0);
            if (producto.tipo === "Elaborado") {
                const costoResult = await client.query(`
                    SELECT costo_unitario_prod
                    FROM v_productos_elaborados_costo_actual
                    WHERE id_producto = $1
                    `,
                    [idProducto]);
                costoUnitario = Number(costoResult.rows[0]?.costo_unitario_prod || 0);
            }

            await client.query(`
                INSERT INTO movimiento_producto (
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
                VALUES (
                    $1,
                    $2,
                    $3,
                    'SALIDA',
                    $4,
                    $5,
                    $6,
                    $7,
                    'VENTA'
                )
                `,
                [
                    idProducto,
                    anio,
                    mes,
                    cantidad, `Venta #${venta.id_venta}`,
                    costoUnitario,
                    Math.round(cantidad * costoUnitario * 100) / 100
                ]);
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

//Ventas diarias
router.get("/diarias", async (req, res) => {
    try {
        const {
            desde,
            hasta
        } = req.query;
        if (!desde || !hasta) {
            return res.status(400).json({
                mensaje: "Debe indicar las fechas desde y hasta."
            });
        }
        if (desde > hasta) {
            return res.status(400).json({
                mensaje: "La fecha desde no puede ser posterior a la fecha hasta."
            });
        }
        const resultado = await pool.query(`
            SELECT
                v.id_venta,
                v.fecha,
                v.total,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id_producto', dv.id_producto,
                            'nombre', p.nombre,
                            'cantidad', dv.cantidad_vendida,
                            'precio_unitario', dv.precio_unitario,
                            'subtotal', dv.subtotal
                        )
                        ORDER BY dv.id_detalle_venta
                    ) FILTER (
                        WHERE dv.id_detalle_venta IS NOT NULL
                    ),
                    '[]'::json
                ) AS detalles
            FROM venta v
            LEFT JOIN detalle_venta dv
                ON dv.id_venta = v.id_venta
            LEFT JOIN producto p
                ON p.id_producto = dv.id_producto
            WHERE v.fecha BETWEEN $1 AND $2
            GROUP BY
                v.id_venta,
                v.fecha,
                v.total
            ORDER BY
                v.fecha DESC,
                v.id_venta DESC;
            `,
            [desde, hasta]);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error("Error al consultar ventas por rango:", error);
        res.status(500).json({
            mensaje: "No se pudieron consultar las ventas del período seleccionado."
        });
    }
});

//Resumen semanal
router.get("/semanales", async (req, res) => {
    try {
        const {
            desde,
            hasta
        } = req.query;
        if (!desde || !hasta) {
            return res.status(400).json({
                mensaje: "Debe indicar las fechas desde y hasta."
            });
        }
        if (desde > hasta) {
            return res.status(400).json({
                mensaje: "La fecha desde no puede ser posterior a la fecha hasta."
            });
        }
        const resultado = await pool.query(`
            SELECT
                fecha,
                COUNT(*) AS cantidad_ventas,
                COALESCE(SUM(total), 0) AS total_ventas
            FROM venta
            WHERE fecha BETWEEN $1 AND $2
            GROUP BY fecha
            ORDER BY fecha;
            `,
            [desde, hasta]);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error("Error al consultar ventas semanales:", error);
        res.status(500).json({
            mensaje: "No se pudieron consultar las ventas por día."
        });
    }
});

//Resumen mensual
router.get("/mensuales", async (req, res) => {
    try {
        const {
            desde,
            hasta
        } = req.query;
        if (!desde || !hasta) {
            return res.status(400).json({
                mensaje: "Debe indicar las fechas desde y hasta."
            });
        }
        if (desde > hasta) {
            return res.status(400).json({
                mensaje: "La fecha desde no puede ser posterior a la fecha hasta."
            });
        }
        const resultado = await pool.query(`
            SELECT
                DATE_TRUNC('month', fecha)::date AS mes,
                COUNT(*) AS cantidad_ventas,
                COALESCE(SUM(total), 0) AS total_ventas
            FROM venta
            WHERE fecha BETWEEN $1 AND $2
            GROUP BY DATE_TRUNC('month', fecha)
            ORDER BY mes;
            `,
            [desde, hasta]);
        res.status(200).json(resultado.rows);
    } catch (error) {
        console.error("Error al consultar ventas mensuales:", error);
        res.status(500).json({
            mensaje: "No se pudieron consultar las ventas mensuales."
        });
    }
});

//Producto más vendido
router.get("/producto-mas-vendido", async (req, res) => {
    try {
        const {
            desde,
            hasta
        } = req.query;
        if (!desde || !hasta) {
            return res.status(400).json({
                mensaje: "Debe indicar las fechas desde y hasta."
            });
        }
        if (desde > hasta) {
            return res.status(400).json({
                mensaje: "La fecha desde no puede ser posterior a la fecha hasta."
            });
        }
        const resultado = await pool.query(`
            SELECT
                p.id_producto,
                p.nombre,
                p.foto_producto,
                SUM(dv.cantidad_vendida) AS cantidad_vendida,
                COALESCE(
                    SUM(dv.subtotal),
                    0
                ) AS total_vendido
            FROM detalle_venta dv

            INNER JOIN venta v
                ON v.id_venta = dv.id_venta

            INNER JOIN producto p
                ON p.id_producto = dv.id_producto

            WHERE v.fecha BETWEEN $1 AND $2

            GROUP BY
                p.id_producto,
                p.nombre,
                p.foto_producto

            ORDER BY
                cantidad_vendida DESC,
                total_vendido DESC

            LIMIT 1;
            `,
            [desde, hasta]);
        res.status(200).json(resultado.rows[0] || null);
    } catch (error) {
        console.error("Error al consultar producto más vendido:", error);
        res.status(500).json({
            mensaje: "No se pudo consultar el producto más vendido."
        });
    }
});
module.exports = router;
