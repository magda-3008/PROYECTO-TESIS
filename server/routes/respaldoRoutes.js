const express = require("express");
const router = express.Router();
const {
    execFile
} = require("child_process");
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");
const {
    verificarSesion,
    verificarAdministrador
} = require("../middleware/autenticacion");
router.post("/", verificarSesion, verificarAdministrador, async (req, res) => {
    const {
        contrasena_actual
    } = req.body;
    try {
        // ----------------------------------------
        // 1. Validar que se haya enviado contraseña
        // ----------------------------------------
        if (!contrasena_actual || typeof contrasena_actual !== "string") {
            return res.status(400).json({
                mensaje: "Debe ingresar su contraseña de administrador."
            });
        }
        // ----------------------------------------
        // 2. Verificar contraseña del administrador
        // ----------------------------------------
        const resultadoUsuario = await pool.query(`
                SELECT id_usuario
                FROM usuarios
                WHERE id_usuario = $1
                  AND contrasena = crypt($2, contrasena)
                  AND rol = 'Administrador'
                `,
            [
                req.session.usuario.id,
                contrasena_actual
            ]);
        if (resultadoUsuario.rowCount === 0) {
            return res.status(401).json({
                mensaje: "La contraseña de administrador es incorrecta."
            });
        }
        // ----------------------------------------
        // 3. Preparar nombre del archivo
        // ----------------------------------------
        const fecha = new Date();
        const anio = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const dia = String(fecha.getDate()).padStart(2, "0");
        const nombreArchivo = `Respaldo_PaTuBoca_${anio}-${mes}-${dia}.sql`;
        // ----------------------------------------
        // 4. Crear carpeta temporal
        // ----------------------------------------
        const carpetaRespaldo = path.join(__dirname, "../respaldos");
        if (!fs.existsSync(carpetaRespaldo)) {
            fs.mkdirSync(carpetaRespaldo, {
                recursive: true
            });
        }
        const rutaArchivo = path.join(carpetaRespaldo, nombreArchivo);
        // ----------------------------------------
        // 5. Obtener cadena de conexión
        // ----------------------------------------
        const databaseUrl = process.env.BDD_URL;
        if (!databaseUrl) {
            console.error("No se encontró BDD_URL.");
            return res.status(500).json({
                mensaje: "No se encuentra configurada la conexión a la base de datos."
            });
        }
        // ----------------------------------------
        // 6. Ejecutar pg_dump
        // ----------------------------------------
        execFile("pg_dump",
            [
                databaseUrl, "--format=plain", "--file",
                rutaArchivo
            ], async (error, stdout, stderr) => {
                if (error) {
                    console.error("Error al ejecutar pg_dump:", error);
                    console.error("pg_dump stderr:", stderr);
                    // Eliminar archivo incompleto
                    if (fs.existsSync(rutaArchivo)) {
                        fs.unlinkSync(rutaArchivo);
                    }
                    return res.status(500).json({
                        mensaje: "No fue posible generar el respaldo de la base de datos."
                    });
                }
                try {
                    // ----------------------------------------
                    // 7. Descargar el archivo
                    // ----------------------------------------
                    res.download(rutaArchivo, nombreArchivo,
                        (errorDescarga) => {
                            if (errorDescarga) {
                                console.error("Error durante la descarga:", errorDescarga);
                                return;
                            }
                            // ----------------------------------------
                            // 8. Eliminar archivo temporal
                            // ----------------------------------------
                            fs.unlink(rutaArchivo,
                                (errorEliminacion) => {
                                    if (errorEliminacion) {
                                        console.error("No se pudo eliminar el respaldo temporal:", errorEliminacion);
                                    }
                                });
                        });
                } catch (error) {
                    console.error("Error al preparar la descarga:", error);
                    if (fs.existsSync(rutaArchivo)) {
                        fs.unlinkSync(rutaArchivo);
                    }
                    return res.status(500).json({
                        mensaje: "Ocurrió un error al preparar el archivo de respaldo."
                    });
                }
            });
    } catch (error) {
        console.error("Error en la ruta de respaldo:", error);
        return res.status(500).json({
            mensaje: "Ocurrió un error al generar el respaldo."
        });
    }
});
module.exports = router;
