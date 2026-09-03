const express = require("express");
const router = express.Router();
const pool = require("../config/db");

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
