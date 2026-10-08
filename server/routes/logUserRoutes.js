const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const crypto = require("crypto");

const {
    verificarSesion
} = require("../middleware/autenticacion");
router.get("/sesion", verificarSesion,
    (req, res) => {
        res.json({
            autenticado: true,
            usuario: req.session.usuario
        });
    });
function generarClaveRecuperacion() {
    const valor = crypto.randomBytes(12).toString("hex").toUpperCase();

    return {
        valor,
        mostrada: valor.match(/.{1,6}/g).join("-")
    };
}

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
                    rol,
                    clave_recuperacion
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

        let claveRecuperacion = null;

        if (
            usuario.rol === "Administrador" &&
            usuario.clave_recuperacion === null
        ) {
            const nuevaClave = generarClaveRecuperacion();

            const consultaClave = `
                UPDATE usuarios
                SET clave_recuperacion = crypt($1, gen_salt('bf'))
                WHERE id_usuario = $2;
            `;

            await pool.query(
                consultaClave,
                [
                    nuevaClave.valor,
                    usuario.id_usuario
                ]
            );

            claveRecuperacion = nuevaClave.mostrada;
        }

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
            redirigir: "principal.html",
            clave_recuperacion: claveRecuperacion
        });
    } catch (error) {
        console.error("Error en la base de datos:", error);
        return res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
});

router.post("/recuperacion/verificar", async (req, res) => {
    const {
        nombre_usuario,
        clave_recuperacion
    } = req.body;

    if (
        typeof nombre_usuario !== "string" ||
        typeof clave_recuperacion !== "string"
    ) {
        return res.status(400).json({
            mensaje: "Debe ingresar el nombre de usuario y la clave de recuperación."
        });
    }

    const nombreUsuario = nombre_usuario.trim();
    const claveLimpia = clave_recuperacion
        .replace(/-/g, "")
        .replace(/\s/g, "")
        .toUpperCase();

    if (nombreUsuario.length === 0 || claveLimpia.length === 0) {
        return res.status(400).json({
            mensaje: "Debe ingresar el nombre de usuario y la clave de recuperación."
        });
    }

    try {
        const consulta = `
            SELECT
                id_usuario,
                nombre_usuario,
                rol
            FROM usuarios
            WHERE nombre_usuario = $1
              AND rol = 'Administrador'
              AND clave_recuperacion IS NOT NULL
              AND clave_recuperacion = crypt($2, clave_recuperacion);
        `;

        const resultado = await pool.query(
            consulta,
            [
                nombreUsuario,
                claveLimpia
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({
                mensaje: "Nombre de usuario o clave de recuperación incorrectos."
            });
        }

        const usuario = resultado.rows[0];

        /*
         * Regeneramos la sesión para evitar reutilizar
         * una sesión anterior durante el proceso de recuperación.
         */
        req.session.regenerate((error) => {
            if (error) {
                console.error("Error al regenerar la sesión:", error);

                return res.status(500).json({
                    mensaje: "No se pudo iniciar el proceso de recuperación."
                });
            }

            req.session.recuperacion = {
                idUsuario: usuario.id_usuario,
                expira: Date.now() + (10 * 60 * 1000)
            };

            req.session.save((errorGuardar) => {
                if (errorGuardar) {
                    console.error(
                        "Error al guardar la sesión de recuperación:",
                        errorGuardar
                    );

                    return res.status(500).json({
                        mensaje: "No se pudo iniciar el proceso de recuperación."
                    });
                }

                return res.status(200).json({
                    mensaje: "Clave de recuperación válida."
                });
            });
        });

    } catch (error) {
        console.error("Error al verificar la clave de recuperación:", error);

        return res.status(500).json({
            mensaje: "No se pudo verificar la clave de recuperación."
        });
    }
});

router.post("/recuperacion/restablecer", async (req, res) => {
    const {
        contrasena
    } = req.body;

    if (typeof contrasena !== "string" || contrasena.length === 0) {
        return res.status(400).json({
            mensaje: "La nueva contraseña es obligatoria."
        });
    }

    if (
        !req.session.recuperacion ||
        !req.session.recuperacion.idUsuario ||
        !req.session.recuperacion.expira
    ) {
        return res.status(401).json({
            mensaje: "El proceso de recuperación no es válido o ha expirado."
        });
    }

    if (Date.now() > req.session.recuperacion.expira) {
        delete req.session.recuperacion;

        return res.status(401).json({
            mensaje: "El proceso de recuperación ha expirado."
        });
    }

    const idUsuario = req.session.recuperacion.idUsuario;

    try {
        const nuevaClave = generarClaveRecuperacion();

        const consulta = `
            UPDATE usuarios
            SET
                contrasena = crypt($1, gen_salt('bf')),
                clave_recuperacion = crypt($2, gen_salt('bf'))
            WHERE id_usuario = $3
              AND rol = 'Administrador'
            RETURNING
                id_usuario,
                nombre_usuario,
                rol;
        `;

        const resultado = await pool.query(
            consulta,
            [
                contrasena,
                nuevaClave.valor,
                idUsuario
            ]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({
                mensaje: "No se pudo restablecer la contraseña."
            });
        }

        /*
         * El proceso de recuperación ya fue utilizado.
         * Eliminamos la autorización temporal.
         */
        delete req.session.recuperacion;

        req.session.save((errorGuardar) => {
            if (errorGuardar) {
                console.error(
                    "Error al guardar la sesión después de recuperar:",
                    errorGuardar
                );

                return res.status(500).json({
                    mensaje: "La contraseña fue actualizada, pero ocurrió un error al finalizar el proceso."
                });
            }

            return res.status(200).json({
                mensaje: "Contraseña restablecida correctamente.",
                clave_recuperacion: nuevaClave.mostrada
            });
        });

    } catch (error) {
        console.error(
            "Error al restablecer la contraseña:",
            error
        );

        return res.status(500).json({
            mensaje: "No se pudo restablecer la contraseña."
        });
    }
});

module.exports = router;