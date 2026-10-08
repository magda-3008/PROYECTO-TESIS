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
                    Esta es tu clave de recuperación en caso de que olvides tu contraseña.
                    <strong>Guárdala en un lugar seguro.</strong>
                </p>

                <div class="alert alert-warning mt-3 mb-0">
                    <strong>${resultado.clave_recuperacion}</strong>
                </div>

                <p class="mt-3 mb-0 text-muted small">
                    Esta clave se mostrará solamente una vez.
                    Si la pierdes, tendrás que generar una nueva mientras
                    tengas acceso a tu cuenta.
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

document
    .getElementById("btnRecuperarContrasena")
    .addEventListener("click", async () => {

        const { value: datos } = await Swal.fire({
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

                const nombreUsuario =
                    document.getElementById(
                        "nombreUsuarioRecuperacion"
                    ).value.trim();

                const claveRecuperacion =
                    document.getElementById(
                        "claveRecuperacion"
                    ).value.trim();

                if (!nombreUsuario || !claveRecuperacion) {

                    Swal.showValidationMessage(
                        "Debe ingresar el nombre de usuario y la clave de recuperación."
                    );

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

            const respuesta = await fetch(
                "/api/loguser/recuperacion/verificar",
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(datos)
                }
            );

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

            // Aquí continuaremos con el segundo SweetAlert.
            console.log("Clave de recuperación válida.");

        } catch (error) {

            console.error(
                "Error al verificar la recuperación:",
                error
            );

            await Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo conectar con el servidor.",
                confirmButtonText: "Aceptar"
            });
        }
    });