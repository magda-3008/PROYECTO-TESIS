document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    // Capturamos los datos de los inputs
    const nombre_usuario = document.getElementById('username').value;
    const contrasena = document.getElementById('password').value;
    const mensajeLogin = document.getElementById("mensajeLogin");

    mensajeLogin.textContent = "";

    try {
        const respuesta = await fetch('/api/usuarios', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre_usuario, contrasena })
        });

        const resultado = await respuesta.json();

        if (respuesta.ok) {
            alert(resultado.mensaje);
            window.location.href = "Principal.html" 
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

        icono.classList.remove("bi-eye");
        icono.classList.add("bi-eye-slash");

    } else {

        password.type = "password";

        icono.classList.remove("bi-eye-slash");
        icono.classList.add("bi-eye");

    }

});