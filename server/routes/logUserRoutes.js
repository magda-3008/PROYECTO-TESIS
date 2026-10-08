document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre_usuario = document.getElementById("username").value;
    const contrasena = document.getElementById("password").value;
    const mensajeLogin = document.getElementById("mensajeLogin");
    mensajeLogin.textContent = "";
    try {
        const respuesta = await fetch("/api/loguser/login", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre_usuario,
                contrasena
            })
        });
        const resultado = await respuesta.json();
        if (respuesta.ok) {
            /*
             * Si el backend devuelve una clave de recuperación,
             * significa que es la primera vez que este Administrador
             * inicia sesión y todavía no tenía una clave.
             */
            if (resultado.clave_recuperacion) {
                await Swal.fire({
                    icon: "success",
                    title: "Clave de recuperación",
                    html: `
                        <p>
                            Esta es tu clave de recuperación.
                            <strong>Guárdala en un lugar seguro.</strong>
                        </p>

                        <div class="alert alert-warning mt-3 mb-0">
                            <strong>
                                ${resultado.clave_recuperacion}
                            </strong>
                        </div>

                        <p class="mt-3 mb-0 text-muted small">
                            Esta clave se mostrará solamente una vez.
                        </p>
                    `,
                    confirmButtonText: "He guardado mi clave",
                    allowOutsideClick: false,
                    allowEscapeKey: false
                });
            }
            window.location.href = resultado.redirigir || "principal.html";
        } else {
            mensajeLogin.textContent = resultado.mensaje;
        }
    } catch (error) {
        console.error("Hubo un error en la petición:", error);
        mensajeLogin.textContent = "No se pudo conectar con el servidor.";
    }
});
/* =========================================================
   MOSTRAR / OCULTAR CONTRASEÑA
   ========================================================= */
const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const icono = togglePassword.querySelector("i");
togglePassword.addEventListener("click", () => {
    if (password.type === "password") {
        password.type = "text";
        icono.classList.remove("fa-eye");
        icono.classList.add("fa-eye-slash");
        togglePassword.setAttribute("aria-label", "Ocultar contraseña");
    } else {
        password.type = "password";
        icono.classList.remove("fa-eye-slash");
        icono.classList.add("fa-eye");
        togglePassword.setAttribute("aria-label", "Mostrar contraseña");
    }
});
/* =========================================================
   RECUPERACIÓN DE CONTRASEÑA
   ========================================================= */
document.getElementById("btnRecuperarContrasena").addEventListener("click", async () => {
    /* =====================================================
       PASO 1
       Verificar usuario + clave de recuperación
       ===================================================== */
    const {
        value: datos
    } = await Swal.fire({
        title: "Recuperar contraseña",
        html: `
                <input
                    type="text"
                    id="nombreUsuarioRecuperacion"
                    class="swal2-input"
                    placeholder="Nombre de usuario"
                    autocomplete="username"
                >

                <input
                    type="text"
                    id="claveRecuperacion"
                    class="swal2-input"
                    placeholder="Clave de recuperación"
                    autocomplete="off"
                >
            `,
        focusConfirm: false,
        confirmButtonText: "Continuar",
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        allowOutsideClick: false,
        preConfirm: () => {
            const nombreUsuario = document.getElementById("nombreUsuarioRecuperacion").value.trim();
            const claveRecuperacion = document.getElementById("claveRecuperacion").value.trim();
            if (!nombreUsuario || !claveRecuperacion) {
                Swal.showValidationMessage("Debe ingresar el nombre de usuario y la clave de recuperación.");
                return false;
            }
            return {
                nombre_usuario: nombreUsuario,
                clave_recuperacion: claveRecuperacion
            };
        }
    });
    /*
     * Si el usuario presionó "Cancelar",
     * no continuamos con el proceso.
     */
    if (!datos) {
        return;
    }
    /* =====================================================
       ENVIAR DATOS AL SERVIDOR
       ===================================================== */
    try {
        const respuesta = await fetch("/api/loguser/recuperacion/verificar", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(datos)
        });
        const resultado = await respuesta.json();
        /* =================================================
           CLAVE INCORRECTA
           ================================================= */
        if (!respuesta.ok) {
            await Swal.fire({
                icon: "error",
                title: "No se pudo verificar",
                text: resultado.mensaje,
                confirmButtonText: "Aceptar"
            });
            return;
        }
        /* =================================================
           PASO 2
           ESTABLECER NUEVA CONTRASEÑA
           ================================================= */
        const {
            value: contrasena
        } = await Swal.fire({
            title: "Nueva contraseña",
            html: `
                    <input
                        type="password"
                        id="nuevaContrasena"
                        class="swal2-input"
                        placeholder="Nueva contraseña"
                        autocomplete="new-password"
                    >

                    <input
                        type="password"
                        id="confirmarContrasena"
                        class="swal2-input"
                        placeholder="Confirmar contraseña"
                        autocomplete="new-password"
                    >
                `,
            focusConfirm: false,
            confirmButtonText: "Cambiar contraseña",
            showCancelButton: true,
            cancelButtonText: "Cancelar",
            allowOutsideClick: false,
            preConfirm: () => {
                const nuevaContrasena = document.getElementById("nuevaContrasena").value;
                const confirmarContrasena = document.getElementById("confirmarContrasena").value;
                if (!nuevaContrasena || !confirmarContrasena) {
                    Swal.showValidationMessage("Debe completar ambos campos.");
                    return false;
                }
                if (nuevaContrasena !== confirmarContrasena) {
                    Swal.showValidationMessage("Las contraseñas no coinciden.");
                    return false;
                }
                return nuevaContrasena;
            }
        });
        /*
         * Si el usuario cancela el cambio de contraseña,
         * terminamos el proceso.
         */
        if (!contrasena) {
            return;
        }
        /* =================================================
           CAMBIAR CONTRASEÑA
           ================================================= */
        const respuestaRestablecer = await fetch("/api/loguser/recuperacion/restablecer", {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contrasena
            })
        });
        const resultadoRestablecer = await respuestaRestablecer.json();
        /* =================================================
           ERROR AL CAMBIAR CONTRASEÑA
           ================================================= */
        if (!respuestaRestablecer.ok) {
            await Swal.fire({
                icon: "error",
                title: "No se pudo cambiar la contraseña",
                text: resultadoRestablecer.mensaje,
                confirmButtonText: "Aceptar"
            });
            return;
        }
        /* =================================================
           PASO 3
           MOSTRAR NUEVA CLAVE DE RECUPERACIÓN
           ================================================= */
        await Swal.fire({
            icon: "success",
            title: "Contraseña actualizada",
            html: `
                    <p>
                        Tu contraseña se cambió correctamente.
                    </p>

                    <p class="mb-2">
                        Tu nueva clave de recuperación es:
                    </p>

                    <div class="alert alert-warning">
                        <strong>
                            ${resultadoRestablecer.clave_recuperacion}
                        </strong>
                    </div>

                    <p class="text-muted small mb-0">
                        Guárdala en un lugar seguro.
                        Esta clave se mostrará solamente una vez.
                    </p>
                `,
            confirmButtonText: "Continuar",
            allowOutsideClick: false,
            allowEscapeKey: false
        });
        /* =================================================
           VOLVER AL LOGIN
           ================================================= */
        window.location.href = "index.html";
    } catch (error) {
        console.error("Error durante la recuperación:", error);
        await Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo conectar con el servidor.",
            confirmButtonText: "Aceptar"
        });
    }
});
