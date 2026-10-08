const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const crypto = require("crypto");
const {
    verificarSesion,
    verificarAdministrador
} = require("../middleware/autenticacion");

const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API);

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

// router.post("/recuperar", async (req, res) => {

//     const { correo } = req.body;

//     // Validar que se haya enviado un correo
//     if (typeof correo !== "string") {
//         return res.status(400).json({
//             mensaje: "Debe proporcionar un correo electrónico válido."
//         });
//     }

//     const correoNormalizado = correo.trim().toLowerCase();

//     // Validar formato y longitud del correo
//     if (
//         !correoNormalizado ||
//         correoNormalizado.length > 254 ||
//         !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correoNormalizado)
//     ) {
//         return res.status(400).json({
//             mensaje: "Debe proporcionar un correo electrónico válido."
//         });
//     }

//     try {

//         // Buscar el usuario por su correo
//         const resultado = await pool.query(
//             `
//             SELECT id_usuario, correo
//             FROM usuarios
//             WHERE correo = $1
//             `,
//             [correoNormalizado]
//         );

//         if (resultado.rows.length === 0) {
//             return res.status(200).json({
//                 mensaje:
//                     "Si el correo está registrado, recibirá un código de recuperación."
//             });
//         }

//         const usuario = resultado.rows[0];

//         const codigo = crypto.randomInt(10000, 100000).toString();

//         // El código será válido durante 30 minutos
//         const expiracion = new Date(
//             Date.now() + 30 * 60 * 1000
//         );

//         // Guardar código y fecha de expiración
//         await pool.query(
//             `
//             UPDATE usuarios
//             SET
//                 token_recuperacion = $1,
//                 expiracion_token = $2
//             WHERE id_usuario = $3
//             `,
//             [codigo, expiracion, usuario.id_usuario]
//         );

//         // Enviar código mediante Resend
//         const { data, error } = await resend.emails.send({
//             from: "Pa'TuBoca <onboarding@resend.dev>",
//             to: [usuario.correo],
//             subject: "Código de recuperación - Pa'TuBoca",
//             html: `
//                 <div style="
//                     font-family: Arial, sans-serif;
//                     line-height: 1.6;
//                     max-width: 600px;
//                     margin: 0 auto;
//                 ">

//                     <h2>Recuperación de contraseña</h2>

//                     <p>
//                         Recibimos una solicitud para restablecer la contraseña
//                         de tu cuenta en Pa'TuBoca.
//                     </p>

//                     <p>
//                         Tu código de recuperación es:
//                     </p>

//                     <div style="
//                         font-size: 32px;
//                         font-weight: bold;
//                         letter-spacing: 8px;
//                         text-align: center;
//                         margin: 25px 0;
//                     ">
//                         ${codigo}
//                     </div>

//                     <p>
//                         Ingresa este código en el formulario de recuperación
//                         de contraseña del sistema.
//                     </p>

//                     <p>
//                         El código será válido durante
//                         <strong>30 minutos</strong>.
//                     </p>

//                     <p>
//                         Si no solicitaste restablecer tu contraseña,
//                         puedes ignorar este correo.
//                     </p>

//                 </div>
//             `
//         });

//         // Si Resend devuelve un error
//         if (error) {

//             console.error("Error de Resend:", error);

//             // Invalidar el código que ya no pudo enviarse
//             await pool.query(
//                 `
//                 UPDATE usuarios
//                 SET
//                     token_recuperacion = NULL,
//                     expiracion_token = NULL
//                 WHERE id_usuario = $1
//                 `,
//                 [usuario.id_usuario]
//             );

//             return res.status(200).json({
//                 mensaje:
//                     "Si el correo está registrado, recibirá un código de recuperación."
//             });
//         }

//         console.log("Correo de recuperación enviado:", data.id);

//         return res.status(200).json({
//             mensaje:
//                 "Si el correo está registrado, recibirá un código de recuperación."
//         });

//     } catch (error) {

//         console.error(
//             "Error en la recuperación de contraseña:",
//             error
//         );

//         return res.status(500).json({
//             mensaje:
//                 "No se pudo procesar la solicitud. Intente nuevamente."
//         });
//     }
// });

router.get("/", verificarSesion, verificarAdministrador, async (req, res) => {
    try {
        const consulta = `
                SELECT
                    id_usuario,
                    nombre_usuario,
                    rol,
                    correo
                FROM usuarios
                ORDER BY id_usuario DESC;
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
        correo,
        contrasena,
        rol,
        contrasena_actual
    } = req.body;
    // Validar que se hayan enviado todos los datos necesarios
    if (!nombre_usuario || !correo || !contrasena || !rol || !contrasena_actual) {
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

    // Validar correo
    if (typeof correo !== "string") {
        return res.status(400).json({
            mensaje: "El correo electrónico no es válido."
        });
    }

    const correoUsuario = correo.trim().toLowerCase();

    if (correoUsuario.length === 0) {
        return res.status(400).json({
            mensaje: "El correo electrónico es obligatorio."
        });
    }

    if (correoUsuario.length > 254) {
        return res.status(400).json({
            mensaje: "El correo electrónico no puede superar los 254 caracteres."
        });
    }

    const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!patronCorreo.test(correoUsuario)) {
        return res.status(400).json({
            mensaje: "El formato del correo electrónico no es válido."
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
            WHERE nombre_usuario = $1
            OR correo = $2;
        `;

        const resultadoUsuarioExistente = await pool.query(
            consultaUsuarioExistente,
            [nombreUsuario, correoUsuario]
        );

        if (resultadoUsuarioExistente.rows.length > 0) {
            return res.status(409).json({
                mensaje: "El nombre de usuario o correo electrónico ya está en uso."
            });
        }
        const consultaInsertar = `
            INSERT INTO usuarios (
                nombre_usuario,
                correo,
                contrasena,
                rol
            )
            VALUES (
                $1,
                $2,
                crypt($3, gen_salt('bf')),
                $4
            )
            RETURNING
                id_usuario,
                nombre_usuario,
                correo,
                rol;
        `;

        const resultadoInsertar = await pool.query(
            consultaInsertar,
            [
                nombreUsuario,
                correoUsuario,
                contrasena,
                rol
            ]
        );
        return res.status(201).json({
            mensaje: "Usuario creado correctamente.",
            usuario: resultadoInsertar.rows[0]
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                mensaje: "El nombre de usuario o correo electrónico ya está en uso."
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
        correo,
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
    if (
        nombre_usuario === undefined ||
        correo === undefined ||
        rol === undefined ||
        contrasena_actual === undefined
    ) {
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
        // Validar correo
        if (typeof correo !== "string") {
            return res.status(400).json({
                mensaje: "El correo electrónico no es válido."
            });
        }

        const correoUsuario = correo.trim().toLowerCase();

        if (correoUsuario.length === 0) {
            return res.status(400).json({
                mensaje: "El correo electrónico es obligatorio."
            });
        }

        if (correoUsuario.length > 254) {
            return res.status(400).json({
                mensaje: "El correo electrónico no puede superar los 254 caracteres."
            });
        }

        const patronCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!patronCorreo.test(correoUsuario)) {
            return res.status(400).json({
                mensaje: "El formato del correo electrónico no es válido."
            });
        }
        const usuarioActual = resultadoUsuario.rows[0];
        const consultaUsuarioExistente = `
            SELECT id_usuario
            FROM usuarios
            WHERE (nombre_usuario = $1 OR correo = $2)
            AND id_usuario <> $3;
        `;

        const resultadoUsuarioExistente = await pool.query(
            consultaUsuarioExistente,
            [
                nombreUsuario,
                correoUsuario,
                idUsuario
            ]
        );

        if (resultadoUsuarioExistente.rows.length > 0) {
            return res.status(409).json({
                mensaje: "El nombre de usuario o correo electrónico ya está en uso."
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
                    correo = $2,
                    rol = $3,
                    contrasena = crypt($4, gen_salt('bf'))
                WHERE id_usuario = $5
                RETURNING
                    id_usuario,
                    nombre_usuario,
                    correo,
                    rol;
            `;

            valoresActualizar = [
                nombreUsuario,
                correoUsuario,
                rol,
                contrasena,
                idUsuario
            ];
        } else {
            consultaActualizar = `
                UPDATE usuarios
                SET
                    nombre_usuario = $1,
                    correo = $2,
                    rol = $3
                WHERE id_usuario = $4
                RETURNING
                    id_usuario,
                    nombre_usuario,
                    correo,
                    rol;
            `;

            valoresActualizar = [
                nombreUsuario,
                correoUsuario,
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
                mensaje: "El nombre de usuario o correo electrónico ya está en uso."
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

router.get("/prueba-brevo", async (req, res) => {
    try {

        const respuesta = await fetch(
            "https://api.brevo.com/v3/smtp/email",
            {
                method: "POST",
                headers: {
                    "accept": "application/json",
                    "api-key": process.env.BREVO_API_KEY,
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    sender: {
                        name: "Pa'TuBoca",
                        email: process.env.PATUBOCA_EMAIL
                    },
                    to: [
                        {
                            email: "loquitanecia@gmail.com"
                        }
                    ],
                    subject: "Prueba de correo - Pa'TuBoca",
                    htmlContent: `
                        <h2>Prueba de correo</h2>

                        <p>
                            Este correo fue enviado desde Pa'TuBoca
                            utilizando Brevo.
                        </p>

                        <p>
                            Si recibiste este mensaje, la configuración
                            de correo funciona correctamente. :D
                        </p>
                    `
                })
            }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            console.error("Error de Brevo:", resultado);

            return res.status(500).json({
                mensaje: "Brevo rechazó el envío.",
                error: resultado
            });
        }

        console.log("Correo enviado por Brevo:", resultado);

        return res.status(200).json({
            mensaje: "Correo enviado correctamente.",
            resultado
        });

    } catch (error) {

        console.error("Error al conectar con Brevo:", error);

        return res.status(500).json({
            mensaje: "No se pudo enviar el correo."
        });
    }
});

module.exports = router;
