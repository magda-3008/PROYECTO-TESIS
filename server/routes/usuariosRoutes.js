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
router.get("/", verificarSesion, verificarAdministrador, async (req, res) => {
    try {
        const consulta = `
                SELECT
                    id_usuario,
                    nombre_usuario,
                    rol
                FROM usuarios
                ORDER BY nombre_usuario ASC;
            `;
        const resultado = await pool.query(consulta);
        return res.json(resultado.rows);
    } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        return res.status(500).json({
            mensaje: "No se pudieron obtener los usuarios."
        });
    }
});
router.post("/", verificarSesion, verificarAdministrador, async (req, res) => {
    const {
        nombre_usuario,
        contrasena,
        rol,
        contrasena_actual
    } = req.body;
    // Validar que se hayan enviado todos los datos necesarios
    if (!nombre_usuario || !contrasena || !rol || !contrasena_actual) {
        return res.status(400).json({
            mensaje: "Todos los campos son obligatorios."
        });
    }
    // Validar nombre de usuario
    if (typeof nombre_usuario !== "string") {
        return res.status(400).json({
            mensaje: "El nombre de usuario no es válido."
        });
    }
    const nombreUsuario = nombre_usuario.trim();

    if (nombreUsuario.length === 0) {
        return res.status(400).json({
            mensaje: "El nombre de usuario es obligatorio."
        });
    }

    if (/\s/.test(nombreUsuario)) {
        return res.status(400).json({
            mensaje: "El nombre de usuario no puede contener espacios."
        });
    }

    if (nombreUsuario.length > 20) {
        return res.status(400).json({
            mensaje: "El nombre de usuario no puede superar los 20 caracteres."
        });
    }
    // Validar rol
    if (!["Administrador", "Colaborador"].includes(rol)) {
        return res.status(400).json({
            mensaje: "El rol seleccionado no es válido."
        });
    }
    try {
        const consultaAdministrador = `
            SELECT contrasena
            FROM usuarios
            WHERE id_usuario = $1;
        `;
        const resultadoAdministrador = await pool.query(consultaAdministrador,
            [req.session.usuario.id]);
        if (resultadoAdministrador.rows.length === 0) {
            return res.status(401).json({
                mensaje: "No se pudo verificar la identidad del administrador."
            });
        }
        const hashAdministrador = resultadoAdministrador.rows[0].contrasena;
        const consultaVerificacion = `
    SELECT id_usuario
    FROM usuarios
    WHERE id_usuario = $1
      AND contrasena = crypt($2, contrasena);
`;
        const resultadoVerificacion = await pool.query(consultaVerificacion,
            [
                req.session.usuario.id,
                contrasena_actual
            ]);
        if (resultadoVerificacion.rows.length === 0) {
            return res.status(401).json({
                mensaje: "La contraseña de administrador es incorrecta."
            });
        }
        const consultaUsuarioExistente = `
            SELECT 1
            FROM usuarios
            WHERE nombre_usuario = $1;
        `;
        const resultadoUsuarioExistente = await pool.query(consultaUsuarioExistente,
            [nombreUsuario]);
        if (resultadoUsuarioExistente.rows.length > 0) {
            return res.status(409).json({
                mensaje: "El nombre de usuario ya está en uso."
            });
        }
        const consultaInsertar = `
            INSERT INTO usuarios (
                nombre_usuario,
                contrasena,
                rol
            )
            VALUES (
                $1,
                crypt($2, gen_salt('bf')),
                $3
            )
            RETURNING
                id_usuario,
                nombre_usuario,
                rol;
        `;
        const resultadoInsertar = await pool.query(consultaInsertar,
            [
                nombreUsuario,
                contrasena,
                rol
            ]);
        return res.status(201).json({
            mensaje: "Usuario creado correctamente.",
            usuario: resultadoInsertar.rows[0]
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                mensaje: "El nombre de usuario ya está en uso."
            });
        }
        console.error("Error al crear usuario:", error);
        return res.status(500).json({
            mensaje: "No se pudo crear el usuario."
        });
    }
});
router.patch("/:id", verificarSesion, verificarAdministrador, async (req, res) => {
    const idUsuario = Number(req.params.id);
    const {
        nombre_usuario,
        rol,
        contrasena,
        contrasena_actual
    } = req.body;
    // Validar ID
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({
            mensaje: "El identificador del usuario no es válido."
        });
    }
    // Validar campos obligatorios
    if (nombre_usuario === undefined || rol === undefined || contrasena_actual === undefined) {
        return res.status(400).json({
            mensaje: "Faltan datos obligatorios para actualizar el usuario."
        });
    }
    // Validar nombre de usuario
    if (typeof nombre_usuario !== "string") {
        return res.status(400).json({
            mensaje: "El nombre de usuario no es válido."
        });
    }
    const nombreUsuario = nombre_usuario.trim();

    if (nombreUsuario.length === 0) {
        return res.status(400).json({
            mensaje: "El nombre de usuario es obligatorio."
        });
    }

    if (/\s/.test(nombreUsuario)) {
        return res.status(400).json({
            mensaje: "El nombre de usuario no puede contener espacios."
        });
    }

    if (nombreUsuario.length > 20) {
        return res.status(400).json({
            mensaje: "El nombre de usuario no puede superar los 20 caracteres."
        });
    }
    // Validar rol
    if (!["Administrador", "Colaborador"].includes(rol)) {
        return res.status(400).json({
            mensaje: "El rol seleccionado no es válido."
        });
    }
    // Validar contraseña actual
    if (typeof contrasena_actual !== "string" || contrasena_actual.length === 0) {
        return res.status(400).json({
            mensaje: "Debe ingresar su contraseña actual."
        });
    }
    if (contrasena !== undefined && (typeof contrasena !== "string" || contrasena.length === 0)) {
        return res.status(400).json({
            mensaje: "La nueva contraseña no es válida."
        });
    }
    try {
        const consultaVerificacion = `
                SELECT id_usuario
                FROM usuarios
                WHERE id_usuario = $1
                  AND contrasena = crypt($2, contrasena);
            `;
        const resultadoVerificacion = await pool.query(consultaVerificacion,
            [
                req.session.usuario.id,
                contrasena_actual
            ]);
        if (resultadoVerificacion.rows.length === 0) {
            return res.status(401).json({
                mensaje: "La contraseña de administrador es incorrecta."
            });
        }
        // Verificar que el usuario que se quiere editar exista.
        const consultaUsuario = `
                SELECT
                    id_usuario,
                    nombre_usuario,
                    rol
                FROM usuarios
                WHERE id_usuario = $1;
            `;
        const resultadoUsuario = await pool.query(consultaUsuario,
            [idUsuario]);
        if (resultadoUsuario.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El usuario que desea editar no existe."
            });
        }
        const usuarioActual = resultadoUsuario.rows[0];
        const consultaNombreExistente = `
                SELECT id_usuario
                FROM usuarios
                WHERE nombre_usuario = $1
                  AND id_usuario <> $2;
            `;
        const resultadoNombreExistente = await pool.query(consultaNombreExistente,
            [
                nombreUsuario,
                idUsuario
            ]);
        if (resultadoNombreExistente.rows.length > 0) {
            return res.status(409).json({
                mensaje: "El nombre de usuario ya está en uso."
            });
        }
        if (usuarioActual.rol === "Administrador" && rol === "Colaborador") {
            const consultaAdministradores = `
                    SELECT COUNT(*) AS cantidad
                    FROM usuarios
                    WHERE rol = 'Administrador';
                `;
            const resultadoAdministradores = await pool.query(consultaAdministradores);
            const cantidadAdministradores = Number(resultadoAdministradores.rows[0].cantidad);
            if (cantidadAdministradores <= 1) {
                return res.status(400).json({
                    mensaje: "No se puede cambiar el rol porque debe existir al menos un administrador."
                });
            }
        }
        let consultaActualizar;
        let valoresActualizar;
        if (contrasena !== undefined) {
            consultaActualizar = `
                    UPDATE usuarios
                    SET
                        nombre_usuario = $1,
                        rol = $2,
                        contrasena = crypt($3, gen_salt('bf'))
                    WHERE id_usuario = $4
                    RETURNING
                        id_usuario,
                        nombre_usuario,
                        rol;
                `;
            valoresActualizar = [
                nombreUsuario,
                rol,
                contrasena,
                idUsuario
            ];
        } else {
            consultaActualizar = `
                    UPDATE usuarios
                    SET
                        nombre_usuario = $1,
                        rol = $2
                    WHERE id_usuario = $3
                    RETURNING
                        id_usuario,
                        nombre_usuario,
                        rol;
                `;
            valoresActualizar = [
                nombreUsuario,
                rol,
                idUsuario
            ];
        }
        const resultadoActualizar = await pool.query(consultaActualizar, valoresActualizar);
        const usuarioActualizado = resultadoActualizar.rows[0];
        // Si el administrador está editando su propia cuenta, actualizar también los datos almacenados en la sesión.
        if (idUsuario === req.session.usuario.id) {
            req.session.usuario.nombre = usuarioActualizado.nombre_usuario;
            req.session.usuario.rol = usuarioActualizado.rol;
        }
        return res.status(200).json({
            mensaje: "Usuario actualizado correctamente.",
            usuario: usuarioActualizado
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                mensaje: "El nombre de usuario ya está en uso."
            });
        }
        console.error("Error al actualizar el usuario:", error);
        return res.status(500).json({
            mensaje: "No se pudo actualizar el usuario."
        });
    }
});

router.delete("/:id", verificarSesion, verificarAdministrador, async (req, res) => {
    const idUsuario = Number(req.params.id);
    const {
        contrasena_actual
    } = req.body;
    // Validar ID
    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({
            mensaje: "El identificador del usuario no es válido."
        });
    }
    // Validar contraseña actual
    if (typeof contrasena_actual !== "string" || contrasena_actual.length === 0) {
        return res.status(400).json({
            mensaje: "Debe ingresar su contraseña actual."
        });
    }
    // No permitir que el administrador elimine su propia cuenta.
    if (idUsuario === req.session.usuario.id) {
        return res.status(400).json({
            mensaje: "No puedes eliminar tu propia cuenta."
        });
    }
    try {
        // Verificar nuevamente la contraseña
        // del administrador que realiza la operación.
        const consultaVerificacion = `
                SELECT id_usuario
                FROM usuarios
                WHERE id_usuario = $1
                  AND contrasena = crypt($2, contrasena);
            `;
        const resultadoVerificacion = await pool.query(consultaVerificacion,
            [
                req.session.usuario.id,
                contrasena_actual
            ]);
        if (resultadoVerificacion.rows.length === 0) {
            return res.status(401).json({
                mensaje: "La contraseña de administrador es incorrecta."
            });
        }
        // Obtener el usuario que se quiere eliminar.
        const consultaUsuario = `
                SELECT
                    id_usuario,
                    nombre_usuario,
                    rol
                FROM usuarios
                WHERE id_usuario = $1;
            `;
        const resultadoUsuario = await pool.query(consultaUsuario,
            [idUsuario]);
        if (resultadoUsuario.rows.length === 0) {
            return res.status(404).json({
                mensaje: "El usuario que desea eliminar no existe."
            });
        }
        const usuarioAEliminar = resultadoUsuario.rows[0];
        // Si el usuario es administrador, comprobar
        // que no sea el último administrador.
        if (usuarioAEliminar.rol === "Administrador") {
            const consultaAdministradores = `
                    SELECT COUNT(*) AS cantidad
                    FROM usuarios
                    WHERE rol = 'Administrador';
                `;
            const resultadoAdministradores = await pool.query(consultaAdministradores);
            const cantidadAdministradores = Number(resultadoAdministradores.rows[0].cantidad);
            if (cantidadAdministradores <= 1) {
                return res.status(400).json({
                    mensaje: "No se puede eliminar el último administrador del sistema."
                });
            }
        }
        // Eliminar el usuario.
        const consultaEliminar = `
                DELETE FROM usuarios
                WHERE id_usuario = $1
                RETURNING
                    id_usuario,
                    nombre_usuario,
                    rol;
            `;
        const resultadoEliminar = await pool.query(consultaEliminar,
            [idUsuario]);
        return res.status(200).json({
            mensaje: "Usuario eliminado correctamente.",
            usuario: resultadoEliminar.rows[0]
        });
    } catch (error) {
        console.error("Error al eliminar el usuario:", error);
        return res.status(500).json({
            mensaje: "No se pudo eliminar el usuario."
        });
    }
});
module.exports = router;
