const express = require("express");
const router = express.Router();
const pool = require("../config/db");
// Obtener períodos de inventario
router.get("/periodos", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT
                anio,
                mes
            FROM inventario_mensual_producto
            GROUP BY anio, mes
            ORDER BY anio DESC, mes DESC;
        `);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al obtener los períodos."
        });
    }
});
router.get("/", async (req, res) => {
    const {
        anio,
        mes
    } = req.query;
    try {
        const resultado = await pool.query(`
            SELECT *
            FROM v_productos_inventario_periodo
            WHERE anio = $1
              AND mes = $2
            ORDER BY nombre;
            `,
            [anio, mes]);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al obtener los productos."
        });
    }
});
router.get("/analisis", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT *
            FROM v_productos_elaborados_costo_actual
            ORDER BY nombre_producto;
        `);
        res.json(resultado.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al obtener los productos"
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
