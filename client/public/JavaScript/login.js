document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); 

    // Capturamos los datos de los inputs
    const nombre_usuario = document.getElementById('username').value;
    const contrasena = document.getElementById('password').value;

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
            alert(resultado.mensaje); 
        }

    } catch (error) {
        console.error("Hubo un error en la petición:", error);
        alert("No se pudo conectar con el servidor.");
    }
});