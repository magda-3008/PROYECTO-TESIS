let modalEditarUsuario = null;
let usuarioEnEdicion = null;
async function cargarModalEditarUsuario(contenedor, usuario) {
    try {
        const respuesta = await fetch("editar-usuario.html", {
            credentials: "include"
        });
        if (!respuesta.ok) {
            await manejarErrorRespuesta(respuesta, "No se pudo cargar el formulario para editar el usuario.");
            return;
        }
        const html = await respuesta.text();
        contenedor.innerHTML = html;
        const elementoModal = document.getElementById("modalEditarUsuario");
        if (!elementoModal) {
            throw new Error("No se encontró el modal #modalEditarUsuario.");
        }
        modalEditarUsuario = new bootstrap.Modal(elementoModal, {
            focus: false
        });
        usuarioEnEdicion = usuario;
        configurarModalEditarUsuario();
        prepararModalEditarUsuario(usuario);
        modalEditarUsuario.show();
    } catch (error) {
        console.error("Error al cargar el modal para editar usuario:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cargar el formulario de edición."
        });
    }
}

function configurarModalEditarUsuario() {
    const btnGuardar = document.getElementById("btnGuardarUsuarioEditar");
    const btnMostrarContrasena = document.getElementById("btnMostrarContrasenaEditar");
    const btnMostrarConfirmar = document.getElementById("btnMostrarConfirmarContrasenaEditar");
    if (btnGuardar) {
        btnGuardar.addEventListener("click", guardarEdicionUsuario);
    }
    if (btnMostrarContrasena) {
        btnMostrarContrasena.addEventListener("click",
            () => {
                alternarContrasenaEditar("contrasenaUsuarioEditar", btnMostrarContrasena);
            });
    }
    if (btnMostrarConfirmar) {
        btnMostrarConfirmar.addEventListener("click",
            () => {
                alternarContrasenaEditar("confirmarContrasenaEditar", btnMostrarConfirmar);
            });
    }
}

function prepararModalEditarUsuario(usuario) {
    usuarioEnEdicion = usuario;
    limpiarModalEditarUsuario();
    cargarRolesUsuario("rolUsuarioEditar", usuario.rol || "");
    const nombreUsuario = document.getElementById("nombreUsuarioEditar");
    const contrasena = document.getElementById("contrasenaUsuarioEditar");
    const confirmar = document.getElementById("confirmarContrasenaEditar");
    const ayuda = document.getElementById("ayudaContrasenaUsuarioEditar");
    if (nombreUsuario) {
        nombreUsuario.value = usuario.nombre_usuario || "";
    }
    if (contrasena) {
        contrasena.required = false;
    }
    if (confirmar) {
        confirmar.required = false;
    }
    if (ayuda) {
        ayuda.textContent = "Deje este campo vacío si no desea cambiar la contraseña.";
    }
}

function mostrarModalEditarUsuario() {
    if (!modalEditarUsuario) {
        return;
    }
    modalEditarUsuario.show();
}

function validarFormularioEditarUsuario() {
    let valido = true;
    const nombreUsuario = document.getElementById("nombreUsuarioEditar");
    const rolUsuario = document.getElementById("rolUsuarioEditar");
    const contrasenaUsuario = document.getElementById("contrasenaUsuarioEditar");
    const confirmarContrasena = document.getElementById("confirmarContrasenaEditar");
    limpiarErroresEditarUsuario();
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
        mostrarErrorEditar(rolUsuario, "errorRolUsuarioEditar", "Seleccione un rol.");
        valido = false;
    }
    const contrasena = contrasenaUsuario.value;
    const confirmacion = confirmarContrasena.value;
    // La contraseña es opcional al editar.
    if (contrasena) {
        if (!confirmacion) {
            mostrarErrorEditar(confirmarContrasena, "errorConfirmarContrasenaEditar", "Confirme la nueva contraseña.");
            valido = false;
        } else if (contrasena !== confirmacion) {
            mostrarErrorEditar(confirmarContrasena, "errorConfirmarContrasenaEditar", "Las contraseñas no coinciden.");
            valido = false;
        }
    }
    return valido;
}
async function guardarEdicionUsuario() {

    if (!usuarioEnEdicion) {
        return;
    }

    if (!validarFormularioEditarUsuario()) {
        return;
    }

    const nombreUsuario =
        document.getElementById("nombreUsuarioEditar").value.trim();

    const rolUsuario =
        document.getElementById("rolUsuarioEditar").value;

    const contrasenaUsuario =
        document.getElementById("contrasenaUsuarioEditar").value;

    const contrasenaActual =
        await solicitarContrasenaAdministrador();

    if (contrasenaActual === null) {
        return;
    }

    const datosActualizar = {
        nombre_usuario: nombreUsuario,
        rol: rolUsuario,
        contrasena_actual: contrasenaActual
    };

    // Solo enviar una nueva contraseña
    // si realmente se desea cambiar.
    if (contrasenaUsuario) {
        datosActualizar.contrasena = contrasenaUsuario;
    }

    const btnGuardar =
        document.getElementById("btnGuardarUsuarioEditar");

    try {

        if (btnGuardar) {
            btnGuardar.disabled = true;
        }

        const respuesta = await fetch(
            `/api/usuarios/${usuarioEnEdicion.id_usuario}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify(datosActualizar)
            }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {

            if (respuesta.status === 401) {
                throw new Error(
                    "La contraseña de administrador es incorrecta."
                );
            }

            if (respuesta.status === 404) {
                throw new Error(
                    datos.mensaje || "El usuario no existe."
                );
            }

            if (respuesta.status === 409) {
                mostrarErrorEditar(
                    document.getElementById("nombreUsuarioEditar"),
                    "errorNombreUsuarioEditar",
                    datos.mensaje || "El nombre de usuario ya existe."
                );

                return;
            }

            throw new Error(
                datos.mensaje || "No se pudo actualizar el usuario."
            );
        }

        modalEditarUsuario.hide();

        await Swal.fire({
            icon: "success",
            title: "Usuario actualizado",
            text: "Los datos del usuario se actualizaron correctamente.",
            confirmButtonText: "Aceptar"
        });

        await cargarUsuarios();
        aplicarFiltros();

    } catch (error) {

        console.error("Error al editar usuario:", error);

        const errorGeneral =
            document.getElementById("errorGeneralUsuarioEditar");

        if (errorGeneral) {
            errorGeneral.textContent =
                error.message ||
                "No se pudo actualizar el usuario.";
        }

    } finally {

        if (btnGuardar) {
            btnGuardar.disabled = false;
        }
    }
}

function alternarContrasenaEditar(idInput, boton) {
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

function mostrarErrorEditar(elemento, idError, mensaje) {
    if (elemento) {
        elemento.classList.add("is-invalid");
    }
    const error = document.getElementById(idError);
    if (error) {
        error.textContent = mensaje;
    }
}

function limpiarErroresEditarUsuario() {
    document.querySelectorAll("#modalEditarUsuario .error-msg").forEach(elemento => {
        elemento.textContent = "";
    });
    document.querySelectorAll("#modalEditarUsuario input, #modalEditarUsuario select").forEach(elemento => {
        elemento.classList.remove("is-invalid");
    });
}

function limpiarModalEditarUsuario() {
    const form = document.getElementById("formEditarUsuario");
    if (form) {
        form.reset();
    }
    limpiarErroresEditarUsuario();
    const contrasena = document.getElementById("contrasenaUsuarioEditar");
    const confirmar = document.getElementById("confirmarContrasenaEditar");
    if (contrasena) {
        contrasena.type = "password";
        contrasena.required = false;
    }
    if (confirmar) {
        confirmar.type = "password";
        confirmar.required = false;
    }
    document.querySelectorAll("#modalEditarUsuario .btnMostrarContrasena").forEach(boton => {
        const icono = boton.querySelector("i");
        if (!icono) {
            return;
        }
        icono.classList.remove("fa-eye-slash");
        icono.classList.add("fa-eye");
        boton.setAttribute("aria-label", "Mostrar contraseña");
    });
    const ayuda = document.getElementById("ayudaContrasenaUsuarioEditar");
    if (ayuda) {
        ayuda.textContent = "";
    }
}
