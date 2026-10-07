document.addEventListener("DOMContentLoaded", async () => {
    const usuarioActual = await verificarSesionYRedirigir();
    if (!usuarioActual) return;
    // Solo el Administrador puede acceder a los respaldos
    if (usuarioActual.rol !== "Administrador") {
        window.location.href = "principal.html";
        return;
    }
    const btnGenerarRespaldo = document.getElementById("btnGenerarRespaldo");
    if (!btnGenerarRespaldo) return;
    btnGenerarRespaldo.addEventListener("click", generarRespaldo);
});
async function generarRespaldo() {
    const confirmacion = await Swal.fire({
        icon: "question",
        title: "¿Generar respaldo?",
        text: "Se generará una copia de seguridad de la información actual de la base de datos.",
        showCancelButton: true,
        confirmButtonText: "Continuar",
        cancelButtonText: "Cancelar",
        reverseButtons: true,
        allowOutsideClick: false
    });
    if (!confirmacion.isConfirmed) return;
    // Solicitar nuevamente la contraseña del administrador
    const contrasenaActual = await solicitarContrasenaAdministrador();
    if (!contrasenaActual) return;
    // Mostrar estado de procesamiento
    Swal.fire({
        title: "Generando respaldo...",
        text: "Espere un momento mientras se genera la copia de seguridad.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });
    try {
        const respuesta = await fetch("/api/respaldo", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                contrasena_actual: contrasenaActual
            })
        });
        if (!respuesta.ok) {
            let mensaje = "No fue posible generar el respaldo.";
            try {
                const datos = await respuesta.json();
                if (datos.mensaje) {
                    mensaje = datos.mensaje;
                }
            } catch (error) {
                // Si la respuesta no contiene JSON,
                // se mantiene el mensaje predeterminado.
            }
            throw new Error(mensaje);
        }
        // Obtener el archivo generado por el servidor
        const archivo = await respuesta.blob();
        // Obtener el nombre enviado por el backend
        const contenido = respuesta.headers.get("Content-Disposition");
        let nombreArchivo = "Respaldo_PaTuBoca.sql";
        if (contenido) {
            const coincidencia = contenido.match(/filename="?([^"]+)"?/);
            if (coincidencia && coincidencia[1]) {
                nombreArchivo = coincidencia[1];
            }
        }
        // Crear descarga del archivo
        const url = window.URL.createObjectURL(archivo);
        const enlace = document.createElement("a");
        enlace.href = url;
        enlace.download = nombreArchivo;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        window.URL.revokeObjectURL(url);
        // Confirmación
        await Swal.fire({
            icon: "success",
            title: "Respaldo generado",
            text: "La copia de seguridad se ha generado correctamente.",
            confirmButtonText: "Aceptar"
        });
    } catch (error) {
        console.error("Error al generar el respaldo:", error);
        await Swal.fire({
            icon: "error",
            title: "No se pudo generar el respaldo",
            text: error.message || "Ocurrió un error al generar la copia de seguridad.",
            confirmButtonText: "Aceptar"
        });
    }
}
