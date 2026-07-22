const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.get("/", async (req, res) => {
    try {
        const resultado = await pool.query(`
            SELECT *
            FROM materia_prima_y_cd
            ORDER BY id_ma
        `);

        res.json(resultado.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error al obtener materia prima"
        });
    }
});

module.exports = router;