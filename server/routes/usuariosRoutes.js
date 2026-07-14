const express = require("express");
const router = express.Router();
const pool = require("../config/db");

router.post("/", async (req, res) => {
    const { nombre_usuario, contrasena } = req.body;

    try {
        // Ejecutamos la consulta usando la función crypt() de PostgreSQL.
        // Pasamos la columna 'contrasena' como segundo parámetro para que use la misma salt.
        const consulta = `
            SELECT id_usuario, nombre_usuario 
            FROM usuarios 
            WHERE nombre_usuario = $1 
              AND contrasena = crypt($2, contrasena);
        `;
        
        const valores = [nombre_usuario, contrasena];
        const resultado = await pool.query(consulta, valores);

        // Si la consulta devuelve filas, significa que el usuario existe y la contraseña coincide
        if (resultado.rows.length > 0) {
            const usuario = resultado.rows[0];
            
            res.json({ 
                mensaje: "¡Inicio de sesión exitoso!", 
                usuario: { id: usuario.id, nombre: usuario.nombre_usuario },
                redirigir: "/dashboard" 
            });
        } else {
            // Si no devuelve filas, o el usuario no existe o la contraseña está mal
            res.status(401).json({ mensaje: "Usuario o contraseña incorrectos" });
        }

    } catch (error) {
        console.error("Error en la base de datos:", error);
        res.status(500).json({ mensaje: "Error interno del servidor" });
    }
});

module.exports = router;