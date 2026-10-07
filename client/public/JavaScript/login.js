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
