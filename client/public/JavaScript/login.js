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

    const {
        value: datos
    } = await Swal.fire({
        title: "Recuperar contraseña",
        html: `
    < input
        type = "text"
        id = "nombreUsuarioRecuperacion"
        class="swal2-input"
        placeholder = "Nombre de usuario"
        autocomplete = "username"
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
        showCancelButton: true,
        cancelButtonText: "Cancelar",
        confirmButtonText: "Continuar",
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

    if (!datos) {
        return;
    }

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

        if (!respuesta.ok) {
            await Swal.fire({
                icon: "error",
                title: "No se pudo verificar",
                text: resultado.mensaje,
                confirmButtonText: "Aceptar"
            });
            return;
        }

        const {
            value: contrasena
        } = await Swal.fire({
            title: "Nueva contraseña",
            html: `
        <div class="password-container">

            <input
                type="password"
                id="nuevaContrasena"
                class="swal2-input"
                placeholder="Nueva contraseña"
                autocomplete="new-password"
            >

                <button
                    type="button"
                    id="toggleNuevaContrasena"
                    class="btn-ojo"
                    aria-label="Mostrar contraseña"
                >
                    <i class="fa-solid fa-eye"></i>
                </button>

        </div>


        <div class="password-container">

            <input
                type="password"
                id="confirmarContrasena"
                class="swal2-input"
                placeholder="Confirmar contraseña"
                autocomplete="new-password"
            >

                <button
                    type="button"
                    id="toggleConfirmarContrasena"
                    class="btn-ojo"
                    aria-label="Mostrar contraseña"
                >
                    <i class="fa-solid fa-eye"></i>
                </button>

        </div>
        `,
            focusConfirm: false,
            showCancelButton: true,
            cancelButtonText: "Cancelar",
            confirmButtonText: "Cambiar contraseña",
            allowOutsideClick: false,

            didOpen: () => {
                const nuevaContrasena = document.getElementById("nuevaContrasena");
                const toggleNuevaContrasena = document.getElementById("toggleNuevaContrasena");
                const iconoNueva = toggleNuevaContrasena.querySelector("i");
                const confirmarContrasena = document.getElementById("confirmarContrasena");
                const toggleConfirmarContrasena = document.getElementById("toggleConfirmarContrasena");
                const iconoConfirmar = toggleConfirmarContrasena.querySelector("i");

                toggleNuevaContrasena.addEventListener("click",
                    () => {
                        if (nuevaContrasena.type === "password") {
                            nuevaContrasena.type = "text";
                            iconoNueva.classList.remove("fa-eye");
                            iconoNueva.classList.add("fa-eye-slash");
                            toggleNuevaContrasena.setAttribute("aria-label", "Ocultar contraseña");
                        } else {
                            nuevaContrasena.type = "password";
                            iconoNueva.classList.remove("fa-eye-slash");
                            iconoNueva.classList.add("fa-eye");
                            toggleNuevaContrasena.setAttribute("aria-label", "Mostrar contraseña");
                        }
                    });

                toggleConfirmarContrasena.addEventListener("click",
                    () => {
                        if (confirmarContrasena.type === "password") {
                            confirmarContrasena.type = "text";
                            iconoConfirmar.classList.remove("fa-eye");
                            iconoConfirmar.classList.add("fa-eye-slash");
                            toggleConfirmarContrasena.setAttribute("aria-label", "Ocultar contraseña");
                        } else {
                            confirmarContrasena.type = "password";
                            iconoConfirmar.classList.remove("fa-eye-slash");
                            iconoConfirmar.classList.add("fa-eye");
                            toggleConfirmarContrasena.setAttribute("aria-label", "Mostrar contraseña");
                        }
                    });
            },

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

        if (!contrasena) {
            return;
        }

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

        if (!respuestaRestablecer.ok) {
            await Swal.fire({
                icon: "error",
                title: "No se pudo cambiar la contraseña",
                text: resultadoRestablecer.mensaje,
                confirmButtonText: "Aceptar"
            });
            return;
        }

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
