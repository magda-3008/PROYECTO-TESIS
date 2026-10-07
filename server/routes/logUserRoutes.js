const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const {
    verificarSesion,
    verificarAdministrador
} = require("../middleware/autenticacion");
router.get("/sesion", verificarSesion,
    (req, res) => {
        res.json({
            autenticado: true,
            usuario: req.session.usuario
        });
    });
router.post("/logout", verificarSesion,
    (req, res) => {
        req.session.destroy((error) => {
            if (error) {
                console.error("Error al cerrar la sesión:", error);
                return res.status(500).json({
                    mensaje: "No se pudo cerrar la sesión."
                });
            }
            res.clearCookie("connect.sid", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax"
            });
            return res.json({
                mensaje: "Sesión cerrada correctamente."
            });
        });
    });
router.post("/login", async (req, res) => {
    const {
        nombre_usuario,
        contrasena
    } = req.body;
    try {
        const consulta = `
                SELECT
                    id_usuario,
                    nombre_usuario,
                    rol
                FROM usuarios
                WHERE nombre_usuario = $1
                  AND contrasena = crypt($2, contrasena);
            `;
        const valores = [
            nombre_usuario,
            contrasena
        ];
        const resultado = await pool.query(consulta, valores);
        // Credenciales incorrectas
        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: "Usuario o contraseña incorrectos"
            });
        }
        const usuario = resultado.rows[0];
        // Crear sesión
        req.session.usuario = {
            id: usuario.id_usuario,
            nombre: usuario.nombre_usuario,
            rol: usuario.rol
        };
        return res.json({
            mensaje: "¡Inicio de sesión exitoso!",
            usuario: {
                id: usuario.id_usuario,
                nombre: usuario.nombre_usuario,
                rol: usuario.rol
            },
            redirigir: "principal.html"
        });
    } catch (error) {
        console.error("Error en la base de datos:", error);
        return res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

module.exports = router;