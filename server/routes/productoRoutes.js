const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const multer = require("multer");
const supabase = require("../config/supabase");

const upload = multer({
    storage: multer.memoryStorage()
});

router.post("/test-imagen", upload.single("foto"), async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                error: "No se recibió ninguna imagen."
            });
        }

        console.log("Imagen recibida:");
        console.log({
            nombre: req.file.originalname,
            tipo: req.file.mimetype,
            tamaño: req.file.size
        });

        // Crear un nombre único para la imagen
        const extension = req.file.originalname.split(".").pop();
        const nombreArchivo = `productos/prueba-${Date.now()}.${extension}`;

        // Subir a Supabase
        const { data, error } = await supabase.storage
            .from("recetaspatuboca")
            .upload(nombreArchivo, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (error) {
            console.error("Error al subir imagen:", error);

            return res.status(500).json({
                error: "No se pudo subir la imagen.",
                detalle: error.message
            });
        }

        // Obtener URL pública
        const { data: urlData } = supabase.storage
            .from("recetaspatuboca")
            .getPublicUrl(nombreArchivo);

        console.log("Imagen subida correctamente:");
        console.log(urlData.publicUrl);

        res.status(201).json({
            mensaje: "Imagen subida correctamente.",
            archivo: data,
            url: urlData.publicUrl
        });

    } catch (error) {

        console.error("Error en prueba de imagen:", error);

        res.status(500).json({
            error: "Error interno al procesar la imagen."
        });
    }
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

// Crear producto de reventa
router.post("/", async (req, res) => {
    const {
        nombre,
        tipo,
        precio_venta,
        margen_gananciab_esperado,
        stock_inicial,
        costo_compra
    } = req.body;

    if (!nombre || !nombre.trim()) {
        return res.status(400).json({
            error: "El nombre del producto es obligatorio."
        });
    }

    if (tipo !== "Reventa") {
        return res.status(400).json({
            error: "Este endpoint solo permite crear productos de reventa."
        });
    }

    if (precio_venta === undefined || Number(precio_venta) <= 0) {
        return res.status(400).json({
            error: "El precio de venta debe ser mayor que 0."
        });
    }

    if (
        margen_gananciab_esperado === undefined ||
        Number(margen_gananciab_esperado) < 0 ||
        Number(margen_gananciab_esperado) > 100
    ) {
        return res.status(400).json({
            error: "El margen de ganancia debe estar entre 0 y 100."
        });
    }

    if (
        stock_inicial === undefined ||
        Number(stock_inicial) < 0
    ) {
        return res.status(400).json({
            error: "El stock inicial no puede ser negativo."
        });
    }

    if (
        costo_compra === undefined ||
        Number(costo_compra) <= 0
    ) {
        return res.status(400).json({
            error: "El costo de compra debe ser mayor que 0."
        });
    }

    const cliente = await pool.connect();

    try {
        // Iniciar transacción
        await cliente.query("BEGIN");

        const resultadoProducto = await cliente.query(
            `
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
            ]
        );

        const producto = resultadoProducto.rows[0];

        const resultadoReventa = await cliente.query(
            `
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
            ]
        );

        const productoReventa = resultadoReventa.rows[0];

        // Confirmar transacción
        await cliente.query("COMMIT");

        res.status(201).json({
            mensaje: "Producto de reventa creado correctamente.",
            producto: {
                ...producto,
                ...productoReventa
            }
        });

    } catch (error) {

        // Si algo falla, deshacer todo
        await cliente.query("ROLLBACK");

        console.error("Error al crear producto de reventa:", error);

        res.status(500).json({
            error: "No se pudo crear el producto de reventa."
        });

    } finally {
        cliente.release();
    }
});


// Actualizar parcialmente un producto
router.patch("/:id", async (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Campos permitidos para modificar en la tabla 'producto'
    const camposPermitidos = [
        "nombre",
        "precio_venta",
        "margen_gananciab_esperado",
        "estado"
    ];

    // Filtrar solo las claves del body que estén en la lista permitida
    const camposAActualizar = Object.keys(updates).filter(campo =>
        camposPermitidos.includes(campo)
    );

    if (camposAActualizar.length === 0) {
        return res.status(400).json({ error: "No se enviaron campos válidos para actualizar." });
    }

    const setClause = camposAActualizar
        .map((campo, index) => `${campo} = $${index + 1}`)
        .join(", ");

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
            return res.status(404).json({ error: "Producto no encontrado." });
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
