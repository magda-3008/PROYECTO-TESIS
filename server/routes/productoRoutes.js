const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const supabase = require("../config/supabase");
const {
    convertirCantidad,
    convertirTextoANumero
} = require("../utils/conversionUnidades");
const {
    registrarPrimeraProduccion
} = require("../utils/produccion");
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
                p.foto_producto,
                p.stock_minimo_p,

                CASE
                    WHEN p.tipo = 'Reventa'
                        THEN pr.costo_compra

                    WHEN p.tipo = 'Elaborado'
                        THEN COALESCE(v.costo_unitario_prod, 0.00)

                    ELSE 0.00
                END AS costo,

                p.estado,

                CASE
                    WHEN p.tipo = 'Reventa'
                        THEN pr.stock_actual_pr

                    WHEN p.tipo = 'Elaborado'
                        THEN pe.stock_actual_pe

                    ELSE NULL
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
        stock_inicial,
        stock_minimo_p,
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
    if (tipo === "Reventa") {

        // En Reventa el stock inicial es obligatorio
        if (
            stock_inicial === undefined ||
            stock_inicial === null ||
            stock_inicial === "" ||
            Number(stock_inicial) < 0
        ) {
            return res.status(400).json({
                error: "El stock inicial es obligatorio para productos de reventa y no puede ser negativo."
            });
        }

    } else if (tipo === "Elaborado") {

        // En Elaborado el stock inicial puede ser NULL
        if (
            stock_inicial !== undefined &&
            stock_inicial !== null &&
            stock_inicial !== "" &&
            Number(stock_inicial) < 0
        ) {
            return res.status(400).json({
                error: "El stock inicial no puede ser negativo."
            });
        }

    }
    let stockMinimoNumero = null;

    if (
        stock_minimo_p !== undefined &&
        stock_minimo_p !== null &&
        stock_minimo_p !== ""
    ) {
        stockMinimoNumero = Number(stock_minimo_p);

        if (
            !Number.isInteger(stockMinimoNumero) ||
            stockMinimoNumero < 0
        ) {
            return res.status(400).json({
                error: "El stock mínimo debe ser un número entero mayor o igual a 0."
            });
        }
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
                stock_minimo_p
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *;
            `,
            [
                nombre.trim(),
                tipo,
                Number(precio_venta),
                stockMinimoNumero
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
            const stockInicialNumero =
                stock_inicial === undefined ||
                    stock_inicial === null ||
                    stock_inicial === ""
                    ? null
                    : Number(stock_inicial);

            const resultadoElaborado = await cliente.query(`
                    INSERT INTO producto_elaborado (
                        id_producto,
                        stock_actual_pe
                    )
                    VALUES ($1, $2)
                    RETURNING *;
                `, [
                producto.id_producto,
                stockInicialNumero
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
                // Validar el tipo de insumo
                if (ingrediente.tipo !== "materia_prima" && ingrediente.tipo !== "producto") {
                    throw new Error("El tipo de insumo de uno de los ingredientes no es válido.");
                }
                // Validar que tenga el ID correspondiente
                if (ingrediente.tipo === "materia_prima" && !ingrediente.id_ma) {
                    throw new Error("Todos los ingredientes de materia prima deben tener una materia prima seleccionada.");
                }
                if (ingrediente.tipo === "producto" && !ingrediente.id_producto_insumo) {
                    throw new Error("Todos los ingredientes de producto deben tener un producto elaborado seleccionado.");
                }
                // Validar cantidad
                if (ingrediente.cantidad === undefined) {
                    throw new Error("Todos los ingredientes deben tener una cantidad mayor que 0.");
                }
                try {
                    const cantidadNumerica = convertirTextoANumero(ingrediente.cantidad);
                    if (cantidadNumerica <= 0) {
                        throw new Error("Todos los ingredientes deben tener una cantidad mayor que 0.");
                    }
                } catch (error) {
                    throw new Error(`La cantidad "${ingrediente.cantidad}" no es válida. ${error.message}`);
                }
                // Validar unidad
                if (!ingrediente.unidad || !ingrediente.unidad.trim()) {
                    throw new Error("Todos los ingredientes deben tener una unidad seleccionada.");
                }
                // Si es producto, verificar que exista y sea Elaborado
                if (ingrediente.tipo === "producto") {
                    const resultadoProductoInsumo = await cliente.query(`
                SELECT id_producto, nombre, tipo
                FROM producto
                WHERE id_producto = $1;
            `, [
                        Number(ingrediente.id_producto_insumo)
                    ]);
                    if (resultadoProductoInsumo.rowCount === 0) {
                        throw new Error("Uno de los productos seleccionados como insumo no existe.");
                    }
                    const productoInsumo = resultadoProductoInsumo.rows[0];
                    if (productoInsumo.tipo !== "Elaborado") {
                        throw new Error(`El producto "${productoInsumo.nombre}" no puede utilizarse como insumo porque no es un producto elaborado.`);
                    }
                    // Evitar que un producto se utilice a sí mismo
                    if (Number(ingrediente.id_producto_insumo) === Number(producto.id_producto)) {
                        throw new Error("Un producto elaborado no puede utilizarse a sí mismo como insumo.");
                    }
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
                const idMa = ingrediente.tipo === "materia_prima" ? Number(ingrediente.id_ma) : null;
                const idProductoInsumo = ingrediente.tipo === "producto" ? Number(ingrediente.id_producto_insumo) : null;
                let cantidadUtilizada;
                // Si es materia prima se convierte la cantidad ingresada a la unidad con la que se controla el inventario
                if (ingrediente.tipo === "materia_prima") {
                    const resultadoConversion = await convertirCantidad(cliente, idMa, ingrediente.cantidad, ingrediente.unidad);
                    cantidadUtilizada = resultadoConversion.cantidadUtilizada;
                } else if (ingrediente.tipo === "producto") {
                    cantidadUtilizada = convertirTextoANumero(ingrediente.cantidad);
                }
                const resultadoDetalle = await cliente.query(`
                        INSERT INTO detalle_receta (
                            id_receta,
                            id_ma,
                            id_producto_insumo,
                            cantidad_ingresada,
                            unidad_ingresada,
                            cantidad_utilizada
                        )
                        VALUES ($1, $2, $3, $4, $5, $6)
                        RETURNING *;
                    `, [
                    receta.id_receta,
                    idMa,
                    idProductoInsumo,
                    String(ingrediente.cantidad).trim(),
                    ingrediente.unidad.trim(),
                    cantidadUtilizada
                ]);
                detallesReceta.push(resultadoDetalle.rows[0]);
            }
            // Registrar la producción inicial.
            // El stock_inicial representa las unidades que ya fueron elaboradas.
            if (
                stock_inicial !== undefined &&
                stock_inicial !== null &&
                stock_inicial !== ""
            ) {
                await registrarPrimeraProduccion(
                    cliente,
                    producto.id_producto,
                    detallesReceta,
                    Number(stock_inicial),
                    Number(cantidad_producida_base)
                );
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
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const productoResult = await client.query(`
      SELECT
        id_producto,
        tipo
      FROM producto
      WHERE id_producto = $1;
      `,
            [id]);
        if (productoResult.rowCount === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                error: "Producto no encontrado."
            });
        }
        const producto = productoResult.rows[0];
        const camposPermitidos = ["nombre", "precio_venta", "estado", "stock_minimo_p"];
        const camposAActualizar = Object.keys(updates).filter(campo => camposPermitidos.includes(campo));
        if (camposAActualizar.length > 0) {
            const setClause = camposAActualizar.map((campo, index) => `${campo} = $${index + 1}`).join(", ");
            const valores = camposAActualizar.map(campo => updates[campo]);
            valores.push(id);
            await client.query(`
        UPDATE producto
        SET ${setClause}
        WHERE id_producto = $${valores.length};
        `, valores);
        }
        if (updates.costo !== undefined) {
            if (producto.tipo !== "Reventa") {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: "El costo de un producto Elaborado no puede modificarse manualmente."
                });
            }
            const costo = Number(updates.costo);
            if (Number.isNaN(costo) || costo < 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: "El costo debe ser un valor válido mayor o igual a 0."
                });
            }
            const resultadoCosto = await client.query(`
        UPDATE producto_reventa
        SET costo_compra = $1
        WHERE id_producto = $2
        RETURNING costo_compra;
        `,
                [costo, id]);
            if (resultadoCosto.rowCount === 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    error: "No se encontró la información de reventa del producto."
                });
            }
        }
        const productoActualizado = await client.query(`
      SELECT
        p.*,
        CASE
          WHEN p.tipo = 'Reventa'
            THEN pr.costo_compra
          ELSE v.costo_unitario_prod
        END AS costo
      FROM producto p
      LEFT JOIN producto_reventa pr
        ON pr.id_producto = p.id_producto
      LEFT JOIN v_productos_elaborados_costo_actual v
        ON v.id_producto = p.id_producto
      WHERE p.id_producto = $1;
      `,
            [id]);
        await client.query("COMMIT");
        res.json({
            mensaje: "Producto actualizado correctamente.",
            producto: productoActualizado.rows[0]
        });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error al actualizar el producto:", error);
        res.status(500).json({
            error: "Error interno al actualizar el producto."
        });
    } finally {
        client.release();
    }
});
router.patch("/:id/foto", upload.single("foto"), async (req, res) => {
    const {
        id
    } = req.params;
    let nuevaRuta = null;
    try {
        const resultadoProducto = await pool.query(`
            SELECT
                id_producto,
                foto_producto
            FROM producto
            WHERE id_producto = $1;
            `,
            [id]);
        if (resultadoProducto.rowCount === 0) {
            return res.status(404).json({
                error: "Producto no encontrado."
            });
        }
        const producto = resultadoProducto.rows[0];
        if (!req.file) {
            return res.status(400).json({
                error: "No se seleccionó ninguna imagen."
            });
        }
        const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
        if (!tiposPermitidos.includes(req.file.mimetype)) {
            return res.status(400).json({
                error: "El formato de imagen no es válido. Utilice JPG, PNG o WEBP."
            });
        }
        const rutaImagenAnterior = obtenerRutaImagenSupabase(producto.foto_producto);
        const extension = req.file.originalname.split(".").pop().toLowerCase();
        nuevaRuta = `productos/${id}-${Date.now()}.${extension}`;
        const {
            error: errorSubida
        } = await supabase.storage.from("recetaspatuboca").upload(nuevaRuta, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
        });
        if (errorSubida) {
            throw new Error(`No se pudo subir la nueva imagen: ${errorSubida.message}`);
        }
        const {
            data: urlData
        } = supabase.storage.from("recetaspatuboca").getPublicUrl(nuevaRuta);
        const nuevaUrl = urlData.publicUrl;
        const resultado = await pool.query(`
                UPDATE producto
                SET foto_producto = $1
                WHERE id_producto = $2
                RETURNING *;
                `,
            [
                nuevaUrl,
                id
            ]);
        if (rutaImagenAnterior) {
            const {
                error: errorEliminacion
            } = await supabase.storage.from("recetaspatuboca").remove([
                rutaImagenAnterior
            ]);
            if (errorEliminacion) {
                console.error("La nueva imagen se guardó correctamente, pero no se pudo eliminar la imagen anterior:", errorEliminacion);
            }
        }
        return res.json({
            mensaje: producto.foto_producto ? "Foto reemplazada correctamente." : "Foto agregada correctamente.",
            producto: resultado.rows[0]
        });
    } catch (error) {
        if (nuevaRuta) {
            try {
                await supabase.storage.from("recetaspatuboca").remove([
                    nuevaRuta
                ]);
            } catch (errorLimpieza) {
                console.error("No se pudo eliminar la nueva imagen después del error:", errorLimpieza);
            }
        }
        console.error("Error al actualizar la foto del producto:", error);
        return res.status(500).json({
            error: error.message || "No se pudo actualizar la foto del producto."
        });
    }
});

function obtenerRutaImagenSupabase(url) {
    if (!url) {
        return null;
    }
    const marcador = "/storage/v1/object/public/recetaspatuboca/";
    const posicion = url.indexOf(marcador);
    if (posicion === -1) {
        return null;
    }
    return url.substring(posicion + marcador.length);
}
module.exports = router;
