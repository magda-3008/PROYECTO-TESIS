const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT *
            FROM receta
            ORDER BY id_receta
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al obtener las recetas"
        });
    }
});

router.get("/:id", async (req, res) => {

    const { id } = req.params;

    try {
        const [rows] = await pool.query(
            `SELECT *
             FROM detalle_receta
             WHERE id_receta = ?`,
            [id]
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al obtener detalles de la receta"
        });
    }
});

module.exports = router;