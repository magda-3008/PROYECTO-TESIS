let modalAgregarUsuario = null;
async function cargarModalAgregarUsuario(contenedor) {
    try {
        const respuesta = await fetch("agregar-usuario.html", {
            credentials: "include"
        });
        if (!respuesta.ok) {
            await manejarErrorRespuesta(respuesta, "No se pudo cargar el formulario para agregar el usuario.");
            return;
        }
        const html = await respuesta.text();
        contenedor.innerHTML = html;
        const elementoModal = document.getElementById("modalAgregarUsuario");
        if (!elementoModal) {
            throw new Error("No se encontró el modal #modalAgregarUsuario.");
        }
        modalAgregarUsuario = new bootstrap.Modal(elementoModal, {
            focus: false
        });
        configurarModalAgregarUsuario();
        prepararModalAgregarUsuario();
        modalAgregarUsuario.show();
    } catch (error) {
        console.error("Error al cargar el modal para agregar usuario:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cargar el formulario para agregar usuario."
        });
    }
}

function configurarModalAgregarUsuario() {
    const btnGuardar = document.getElementById("btnGuardarUsuarioAgregar");
    const btnMostrarContrasena = document.getElementById("btnMostrarContrasenaAgregar");
    const btnMostrarConfirmar = document.getElementById("btnMostrarConfirmarContrasenaAgregar");
    const form = document.getElementById("formAgregarUsuario");
    const elementoModal = document.getElementById("modalAgregarUsuario");
    if (btnGuardar) {
        btnGuardar.addEventListener("click", guardarNuevoUsuario);
    }
    if (btnMostrarContrasena) {
        btnMostrarContrasena.addEventListener("click",
            () => {
                alternarContrasenaAgregar("contrasenaUsuarioAgregar", btnMostrarContrasena);
            });
    }
    if (btnMostrarConfirmar) {
        btnMostrarConfirmar.addEventListener("click",
            () => {
                alternarContrasenaAgregar("confirmarContrasenaAgregar", btnMostrarConfirmar);
            });
    }
    if (form) {
        form.addEventListener("submit", function (evento) {
            evento.preventDefault();
            guardarNuevoUsuario();
        });
    }
    if (elementoModal) {
        elementoModal.addEventListener("hidden.bs.modal", limpiarModalAgregarUsuario);
    }
}

function prepararModalAgregarUsuario() {
    if (!modalAgregarUsuario) {
        return;
    }
    limpiarModalAgregarUsuario();
    cargarRolesUsuario("rolUsuarioAgregar");
    const contrasena = document.getElementById("contrasenaUsuarioAgregar");
    const confirmar = document.getElementById("confirmarContrasenaAgregar");
    if (contrasena) {
        contrasena.required = true;
    }
    if (confirmar) {
        confirmar.required = true;
    }
    const ayuda = document.getElementById("ayudaContrasenaUsuarioAgregar");
    if (ayuda) {
        ayuda.textContent = "";
    }
}

function mostrarModalAgregarUsuario() {
    if (!modalAgregarUsuario) {
        return;
    }
    prepararModalAgregarUsuario();
    modalAgregarUsuario.show();
}

function validarFormularioAgregarUsuario() {
    let valido = true;
    const nombreUsuario = document.getElementById("nombreUsuarioAgregar");
    const rolUsuario = document.getElementById("rolUsuarioAgregar");
    const contrasenaUsuario = document.getElementById("contrasenaUsuarioAgregar");
    const confirmarContrasena = document.getElementById("confirmarContrasenaAgregar");
    limpiarErroresAgregarUsuario();
    const nombre = nombreUsuario.value.trim();
    if (!nombre) {
        mostrarErrorAgregar(
            nombreUsuario,
            "errorNombreUsuarioAgregar",
            "Ingrese el nombre de usuario."
        );
        valido = false;

    } else if (/\s/.test(nombre)) {
        mostrarErrorAgregar(
            nombreUsuario,
            "errorNombreUsuarioAgregar",
            "El nombre de usuario no puede contener espacios."
        );
        valido = false;

    } else if (nombre.length > 20) {
        mostrarErrorAgregar(
            nombreUsuario,
            "errorNombreUsuarioAgregar",
            "El nombre de usuario no puede superar los 20 caracteres."
        );
        valido = false;
    }
    if (!rolUsuario.value) {
        mostrarErrorAgregar(rolUsuario, "errorRolUsuarioAgregar", "Seleccione un rol.");
        valido = false;
    }
    const contrasena = contrasenaUsuario.value;
    const confirmacion = confirmarContrasena.value;
    if (!contrasena) {
        mostrarErrorAgregar(contrasenaUsuario, "errorContrasenaUsuarioAgregar", "Ingrese una contraseña.");
        valido = false;
    }
    if (!confirmacion) {
        mostrarErrorAgregar(confirmarContrasena, "errorConfirmarContrasenaAgregar", "Confirme la contraseña.");
        valido = false;
    } else if (contrasena !== confirmacion) {
        mostrarErrorAgregar(confirmarContrasena, "errorConfirmarContrasenaAgregar", "Las contraseñas no coinciden.");
        valido = false;
    }
    return valido;
}

async function guardarNuevoUsuario() {

    // Validar primero todos los datos del formulario.
    if (!validarFormularioAgregarUsuario()) {
        return;
    }

    const nombreUsuario =
        document.getElementById("nombreUsuarioAgregar").value.trim();

    const rolUsuario =
        document.getElementById("rolUsuarioAgregar").value;

    const contrasenaUsuario =
        document.getElementById("contrasenaUsuarioAgregar").value;

    // Solicitar reautenticación del administrador.
    const contrasenaActual =
        await solicitarContrasenaAdministrador();

    // El administrador canceló la reautenticación.
    if (contrasenaActual === null) {
        return;
    }

    const datos = {
        nombre_usuario: nombreUsuario,
        rol: rolUsuario,
        contrasena: contrasenaUsuario,
        contrasena_actual: contrasenaActual
    };

    try {

        const respuesta = await fetch("/api/usuarios", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify(datos)
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {

            if (respuesta.status === 401) {
                throw new Error(
                    "La contraseña de administrador es incorrecta."
                );
            }

            if (respuesta.status === 409) {
                throw new Error(
                    resultado.mensaje ||
                    "El nombre de usuario ya está en uso."
                );
            }

            throw new Error(
                resultado.mensaje ||
                "No se pudo crear el usuario."
            );
        }

        if (modalAgregarUsuario) {
            modalAgregarUsuario.hide();
        }

        await Swal.fire({
            icon: "success",
            title: "Usuario creado",
            text: "El usuario se creó correctamente.",
            confirmButtonText: "Aceptar"
        });

        await cargarUsuarios();
        aplicarFiltros();

    } catch (error) {

        console.error("Error al crear usuario:", error);

        await Swal.fire({
            icon: "error",
            title: "Error",
            text: error.message ||
                "No se pudo crear el usuario.",
            confirmButtonText: "Aceptar"
        });
    }
}

function alternarContrasenaAgregar(idInput, boton) {
    const input = document.getElementById(idInput);
    const icono = boton.querySelector("i");
    if (!input || !icono) {
        return;
    }
    if (input.type === "password") {
        input.type = "text";
        icono.classList.remove("fa-eye");
        icono.classList.add("fa-eye-slash");
        boton.setAttribute("aria-label", "Ocultar contraseña");
    } else {
        input.type = "password";
        icono.classList.remove("fa-eye-slash");
        icono.classList.add("fa-eye");
        boton.setAttribute("aria-label", "Mostrar contraseña");
    }
}

function mostrarErrorAgregar(elemento, idError, mensaje) {
    if (elemento) {
        elemento.classList.add("is-invalid");
    }
    const error = document.getElementById(idError);
    if (error) {
        error.textContent = mensaje;
    }
}

function limpiarErroresAgregarUsuario() {
    document.querySelectorAll("#modalAgregarUsuario .error-msg").forEach(elemento => {
        elemento.textContent = "";
    });
    document.querySelectorAll("#modalAgregarUsuario input, #modalAgregarUsuario select").forEach(elemento => {
        elemento.classList.remove("is-invalid");
    });
}

function limpiarModalAgregarUsuario() {
    const form = document.getElementById("formAgregarUsuario");
    if (form) {
        form.reset();
    }
    limpiarErroresAgregarUsuario();
    const contrasena = document.getElementById("contrasenaUsuarioAgregar");
    const confirmar = document.getElementById("confirmarContrasenaAgregar");
    if (contrasena) {
        contrasena.type = "password";
        contrasena.required = false;
    }
    if (confirmar) {
        confirmar.type = "password";
        confirmar.required = false;
    }
    document.querySelectorAll("#modalAgregarUsuario .btnMostrarContrasena").forEach(boton => {
        const icono = boton.querySelector("i");
        if (!icono) {
            return;
        }
        icono.classList.remove("fa-eye-slash");
        icono.classList.add("fa-eye");
        boton.setAttribute("aria-label", "Mostrar contraseña");
    });
}
