async function obtenerSesion() {
    try {
        const respuesta = await fetch("/api/usuarios/sesion", {
            credentials: "include",
        });
        // La sesión ya no existe o expiró.
        if (respuesta.status === 401) {
            return null;
        }
        if (!respuesta.ok) {
            throw new Error("No se pudo verificar la sesión.");
        }
        const datos = await respuesta.json();
        return datos.usuario;
    } catch (error) {
        console.error("Error al verificar la sesión:", error);
        return null;
    }
}
async function verificarSesionYRedirigir() {
    const usuario = await obtenerSesion();
    if (!usuario) {
        window.location.href = "/index.html";
        return null;
    }
    return usuario;
}
async function manejarErrorRespuesta(respuesta, mensajePredeterminado) {
    let datos = {};
    try {
        datos = await respuesta.json();
    } catch (error) {
        // La respuesta puede no contener JSON.
    }
    // Sesión inexistente o expirada.
    if (respuesta.status === 401) {
        window.location.href = "/index.html";
        return false;
    }
    // Usuario autenticado, pero sin permisos.
    if (respuesta.status === 403) {
        await Swal.fire({
            icon: "error",
            title: "Acceso no permitido",
            text: datos.mensaje || "No tienes permisos para realizar esta acción.",
        });
        return false;
    }
    throw new Error(datos.mensaje || datos.error || mensajePredeterminado);
}

async function cerrarSesion() {
    const confirmacion = await Swal.fire({
        icon: "question",
        title: "¿Cerrar sesión?",
        text: "¿Está seguro de que desea cerrar su sesión?",
        showCancelButton: true,
        confirmButtonText: "Sí, cerrar sesión",
        cancelButtonText: "Cancelar",
        reverseButtons: true
    });
    if (!confirmacion.isConfirmed) {
        return false;
    }
    try {
        const respuesta = await fetch("/api/loguser/logout", {
            method: "POST",
            credentials: "include"
        });
        if (!respuesta.ok) {
            await manejarErrorRespuesta(respuesta, "No se pudo cerrar la sesión.");
            return false;
        }
        window.location.href = "/index.html";
        return true;
    } catch (error) {
        console.error("Error al cerrar la sesión:", error);
        await Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cerrar la sesión."
        });
        return false;
    }
}
