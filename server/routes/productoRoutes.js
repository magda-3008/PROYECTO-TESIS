const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const supabase = require("../config/supabase");
const upload = multer({
    storage: multer.memoryStorage()
});
router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                p.id_producto,
                p.nombre,
                p.tipo,
                p.precio_venta,
                CASE
                    WHEN p.tipo = 'Reventa'
                        THEN pr.costo_compra
                    WHEN p.tipo = 'Elaborado'
                        THEN COALESCE(v.costo_unitario_prod, 0.00)
                    ELSE 0.00
                END AS costo,
                p.margen_gananciab_esperado,
                p.estado,
                CASE
                    WHEN p.tipo = 'Reventa'
                        THEN COALESCE(pr.stock_actual_pr, 0)
                    WHEN p.tipo = 'Elaborado'
                        THEN COALESCE(pe.stock_actual_pe, 0)
                    ELSE 0
                END AS stock_actual
            FROM producto p
            LEFT JOIN producto_reventa pr
                ON p.id_producto = pr.id_producto
            LEFT JOIN producto_elaborado pe
                ON p.id_producto = pe.id_producto
            LEFT JOIN v_productos_elaborados_costo_actual v
                ON p.id_producto = v.id_producto
            ORDER BY p.nombre;
        `);
        res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener el inventario de productos:", error);
        res.status(500).json({
            error: "No se pudo obtener el inventario de productos."
        });
    }
});
// Crear producto de reventa o elaborado
router.post("/", upload.single("foto"), async (req, res) => {
    const {
        nombre,
        tipo,
        precio_venta,
        margen_gananciab_esperado,
        stock_inicial,
        costo_compra,
        // Datos de receta
        nombre_receta,
        cantidad_producida_base,
        descripcion_receta,
        ingredientes
    } = req.body;
    if (!nombre || !nombre.trim()) {
        return res.status(400).json({
            error: "El nombre del producto es obligatorio."
        });
    }
    if (tipo !== "Reventa" && tipo !== "Elaborado") {
        return res.status(400).json({
            error: "El tipo de producto no es válido."
        });
    }
    if (precio_venta === undefined || Number(precio_venta) <= 0) {
        return res.status(400).json({
            error: "El precio de venta debe ser mayor que 0."
        });
    }
    if (margen_gananciab_esperado === undefined || Number(margen_gananciab_esperado) < 0 || Number(margen_gananciab_esperado) > 100) {
        return res.status(400).json({
            error: "El margen de ganancia debe estar entre 0 y 100."
        });
    }
    if (stock_inicial === undefined || Number(stock_inicial) < 0) {
        return res.status(400).json({
            error: "El stock inicial no puede ser negativo."
        });
    }
    if (tipo === "Reventa") {
        if (costo_compra === undefined || Number(costo_compra) <= 0) {
            return res.status(400).json({
                error: "El costo de compra debe ser mayor que 0."
            });
        }
    }
    if (tipo === "Elaborado") {
        if (!nombre_receta || !nombre_receta.trim()) {
            return res.status(400).json({
                error: "El nombre de la receta es obligatorio."
            });
        }
        if (cantidad_producida_base === undefined || Number(cantidad_producida_base) <= 0) {
            return res.status(400).json({
                error: "La cantidad producida base debe ser mayor que 0."
            });
        }
        if (!ingredientes) {
            return res.status(400).json({
                error: "Debe ingresar al menos un ingrediente."
            });
        }
    }
    const cliente = await pool.connect();
    let rutaImagen = null;
    try {
        await cliente.query("BEGIN");
        const resultadoProducto = await cliente.query(`
            INSERT INTO producto (
                nombre,
                tipo,
                precio_venta,
                margen_gananciab_esperado
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *;
            `,
            [
                nombre.trim(),
                tipo,
                Number(precio_venta),
                Number(margen_gananciab_esperado)
            ]);
        const producto = resultadoProducto.rows[0];
        if (req.file) {
            const extension = req.file.originalname.split(".").pop().toLowerCase();
            rutaImagen = `productos/${producto.id_producto}-${Date.now()}.${extension}`;
            const {
                error: errorSubida
            } = await supabase.storage.from("recetaspatuboca").upload(rutaImagen, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });
            if (errorSubida) {
                throw new Error(`No se pudo subir la imagen: ${errorSubida.message}`);
            }
            // Obtener URL pública
            const {
                data: urlData
            } = supabase.storage.from("recetaspatuboca").getPublicUrl(rutaImagen);
            // Guardar URL
            await cliente.query(`
                UPDATE producto
                SET foto_producto = $1
                WHERE id_producto = $2;
                `,
                [
                    urlData.publicUrl,
                    producto.id_producto
                ]);
            producto.foto_producto = urlData.publicUrl;
        }
        if (tipo === "Reventa") {
            const resultadoReventa = await cliente.query(`
                    INSERT INTO producto_reventa (
                        id_producto,
                        costo_compra,
                        stock_actual_pr
                    )
                    VALUES ($1, $2, $3)
                    RETURNING *;
                    `,
                [
                    producto.id_producto,
                    Number(costo_compra),
                    Number(stock_inicial)
                ]);
            const productoReventa = resultadoReventa.rows[0];
            await cliente.query("COMMIT");
            return res.status(201).json({
                mensaje: "Producto de reventa creado correctamente.",
                producto: {
                    ...producto,
                    ...productoReventa
                }
            });
        }
        if (tipo === "Elaborado") {
            const resultadoElaborado = await cliente.query(`
                    INSERT INTO producto_elaborado (
                        id_producto,
                        stock_actual_pe
                    )
                    VALUES ($1, $2)
                    RETURNING *;
                    `,
                [
                    producto.id_producto,
                    Number(stock_inicial)
                ]);
            const productoElaborado = resultadoElaborado.rows[0];
            let ingredientesParseados;
            try {
                ingredientesParseados = JSON.parse(ingredientes);
            } catch (error) {
                throw new Error("Los ingredientes de la receta no tienen un formato válido.");
            }
            if (!Array.isArray(ingredientesParseados) || ingredientesParseados.length === 0) {
                throw new Error("La receta debe contener al menos un ingrediente.");
            }
            for (const ingrediente of ingredientesParseados) {
                if (!ingrediente.id_ma) {
                    throw new Error("Todos los ingredientes deben tener una materia prima seleccionada.");
                }
                if (ingrediente.cantidad === undefined || Number(ingrediente.cantidad) <= 0) {
                    throw new Error("Todos los ingredientes deben tener una cantidad mayor que 0.");
                }
                if (!ingrediente.unidad || !ingrediente.unidad.trim()) {
                    throw new Error("Todos los ingredientes deben tener una unidad seleccionada.");
                }
            }
            const resultadoReceta = await cliente.query(`
                    INSERT INTO receta (
                        id_producto,
                        nombre_receta,
                        cantidad_producida_base,
                        descripcion
                    )
                    VALUES ($1, $2, $3, $4)
                    RETURNING *;
                    `,
                [
                    producto.id_producto,
                    nombre_receta.trim(),
                    Number(cantidad_producida_base),
                    descripcion_receta ? descripcion_receta.trim() : null
                ]);
            const receta = resultadoReceta.rows[0];
            const detallesReceta = [];
            for (const ingrediente of ingredientesParseados) {
                const resultadoDetalle = await cliente.query(`
                        INSERT INTO detalle_receta (
                            id_receta,
                            id_ma,
                            cantidad_utilizada,
                            unidad_utilizada
                        )
                        VALUES ($1, $2, $3, $4)
                        RETURNING *;
                        `,
                    [
                        receta.id_receta,
                        Number(ingrediente.id_ma),
                        Number(ingrediente.cantidad),
                        ingrediente.unidad.trim()
                    ]);
                detallesReceta.push(resultadoDetalle.rows[0]);
            }
            await cliente.query("COMMIT");
            return res.status(201).json({
                mensaje: "Producto elaborado creado correctamente.",
                producto: {
                    ...producto,
                    ...productoElaborado
                },
                receta: receta,
                ingredientes: detallesReceta
            });
        }
    } catch (error) {
        await cliente.query("ROLLBACK");
        if (rutaImagen) {
            try {
                await supabase.storage.from("recetaspatuboca").remove([rutaImagen]);
                console.log("Imagen eliminada de Supabase después del error.");
            } catch (errorImagen) {
                console.error("No se pudo eliminar la imagen de Supabase:", errorImagen);
            }
        }
        console.error("Error al crear producto:", error);
        res.status(500).json({
            error: error.message || "No se pudo crear el producto."
        });
    } finally {
        cliente.release();
    }
});

// Actualizar parcialmente un producto
router.patch("/:id", async (req, res) => {
    const {
        id
    } = req.params;
    const updates = req.body;
    // Campos permitidos para modificar en la tabla 'producto'
    const camposPermitidos = ["nombre", "precio_venta", "margen_gananciab_esperado", "estado"];
    // Filtrar solo las claves del body que estén en la lista permitida
    const camposAActualizar = Object.keys(updates).filter(campo => camposPermitidos.includes(campo));
    if (camposAActualizar.length === 0) {
        return res.status(400).json({
            error: "No se enviaron campos válidos para actualizar."
        });
    }
    const setClause = camposAActualizar.map((campo, index) => `${campo} = $${index + 1}`).join(", ");
    const valores = camposAActualizar.map(campo => updates[campo]);
    valores.push(id);
    try {
        const consulta = `
            UPDATE producto
            SET ${setClause}
            WHERE id_producto = $${valores.length}
            RETURNING *;
        `;
        const resultado = await pool.query(consulta, valores);
        if (resultado.rowCount === 0) {
            return res.status(404).json({
                error: "Producto no encontrado."
            });
        }
        res.json({
            mensaje: "Producto actualizado correctamente.",
            producto: resultado.rows[0]
        });
    } catch (error) {
        console.error("Error al actualizar el producto:", error);
        res.status(500).json({
            error: "Error interno al actualizar el producto."
        });
    }
});
module.exports = router;
