let tablaUsuarios = null;
let usuarioActual = null;
const ROLES_USUARIO = ["Administrador", "Colaborador"];

function cargarRolesUsuario(selectId, rolSeleccionado = "") {
    const select = document.getElementById(selectId);
    if (!select) {
        return;
    }
    select.innerHTML = `
        <option value="" disabled>
            Seleccione un rol
        </option>
    `;
    ROLES_USUARIO.forEach(rol => {
        const opcion = document.createElement("option");
        opcion.value = rol;
        opcion.textContent = rol;
        if (rol === rolSeleccionado) {
            opcion.selected = true;
        }
        select.appendChild(opcion);
    });
}

function inicializarBotonAgregarUsuario() {
    const contenedor = document.getElementById("contenedorModalAgregarUsuario");
    const btnAgregarUsuario = document.getElementById("btnAgregarUsuario");
    if (!contenedor) {
        console.error("No se encontró el contenedor #contenedorModalAgregarUsuario");
        return;
    }
    if (!btnAgregarUsuario) {
        console.error("No se encontró el botón #btnAgregarUsuario");
        return;
    }
    btnAgregarUsuario.addEventListener("click", async () => {
        await cargarModalAgregarUsuario(contenedor);
    });
}
const usuariosConfiguracion = {
    columns: [{
        title: "Usuario",
        field: "nombre_usuario",
        frozen: true,
        headerWordWrap: true,
        headerTooltip: true,
        hozAlign: "center"
    }, {
        title: "Rol",
        field: "rol",
        hozAlign: "center",
        headerWordWrap: true,
        formatter: function (cell) {
            const rol = cell.getValue();
            if (rol === "Administrador") {
                return `
                        <span class="badge-rol administrador">
                            Administrador
                        </span>
                    `;
            }
            if (rol === "Colaborador") {
                return `
                        <span class="badge-rol colaborador">
                            Colaborador
                        </span>
                    `;
            }
            return rol;
        }
    }, {
        title: "Acciones",
        hozAlign: "center",
        headerSort: false,
        formatter: function () {
            return `            
                <div class="acciones-tabla">
                    <button class="btnAccion btnEditar" title="Editar usuario"> <i class="fa-sharp fa-solid fa-pencil"></i> </button>
                    <button class="btnAccion btnSalida" title="Eliminar usuario"><i class="fa-solid fa-trash"></i></button>
                </div>
                `;
        },
        cellClick: function (evento, cell) {
            const usuario = cell.getRow().getData();
            if (evento.target.closest(".btnEditar")) {
                abrirModalEditarUsuario(usuario);
                return;
            }
            if (evento.target.closest(".btnSalida")) {
                confirmarEliminarUsuario(usuario);
            }
        }
    }]
};
async function cargarVista() {
    try {
        usuarioActual = await verificarSesionYRedirigir();
        if (!usuarioActual) {
            return;
        }
        if (usuarioActual.rol !== "Administrador") {
            await Swal.fire({
                icon: "warning",
                title: "Acceso denegado",
                text: "No tiene permisos para acceder a la gestión de usuarios.",
                confirmButtonText: "Aceptar"
            });
            window.location.href = "principal.html";
            return;
        }
        await cargarUsuarios();
        inicializarEventosFiltros();
        inicializarBotonAgregarUsuario();
    } catch (error) {
        console.error("Error al cargar la vista de usuarios:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudo cargar la gestión de usuarios."
        });
    }
}
async function cargarUsuarios() {
    try {
        const respuesta = await fetch("/api/usuarios", {
            method: "GET",
            credentials: "include",
        });
        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                window.location.href = "index.html";
                return;
            }
            if (respuesta.status === 403) {
                await Swal.fire({
                    icon: "warning",
                    title: "Acceso denegado",
                    text: "No tiene permisos para consultar los usuarios.",
                    confirmButtonText: "Aceptar",
                });
                window.location.href = "principal.html";
                return;
            }
            throw new Error("No se pudieron obtener los usuarios.");
        }
        const datos = await respuesta.json();
        crearTablaUsuarios(datos);
    } catch (error) {
        console.error("Error al obtener los usuarios:", error);
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No se pudieron cargar los usuarios.",
        });
    }
}

function crearTablaUsuarios(datos) {
    if (tablaUsuarios) {
        tablaUsuarios.destroy();
        tablaUsuarios = null;
    }
    tablaUsuarios = new Tabulator("#tablaUsuarios", {
        data: datos,
        tooltipGenerationMode: "hover",
        tooltips: true,
        index: "id_usuario",
        layout: "fitColumns",
        columnHeaderVertAlign: "middle",
        pagination: false,
        movableColumns: false,
        columns: usuariosConfiguracion.columns,
        placeholder: "No se encontraron usuarios.",
    });
}

function inicializarEventosFiltros() {
    const buscar = document.getElementById("buscar");
    const filtroRol = document.getElementById("filtroRol");
    if (buscar) {
        buscar.addEventListener("input", aplicarFiltros);
    }
    if (filtroRol) {
        filtroRol.addEventListener("change", aplicarFiltros);
    }
}

function aplicarFiltros() {
    if (!tablaUsuarios) {
        return;
    }
    const texto = document.getElementById("buscar")?.value.trim().toLowerCase() || "";
    const rol = document.getElementById("filtroRol")?.value || "";
    tablaUsuarios.setFilter(function (data) {
        let coincide = true;
        if (texto) {
            coincide = String(data.nombre_usuario).toLowerCase().includes(texto);
        }
        if (coincide && rol) {
            coincide = data.rol === rol;
        }
        return coincide;
    });
}
async function abrirModalEditarUsuario(usuario) {
    const contenedor = document.getElementById("contenedorModalEditarUsuario");
    if (!contenedor) {
        console.error("No se encontró el contenedor #contenedorModalEditarUsuario");
        return;
    }
    await cargarModalEditarUsuario(contenedor, usuario);
}
async function confirmarEliminarUsuario(usuario) {
    // Evitar que el administrador elimine su propia cuenta.
    if (usuarioActual && usuario.id_usuario === usuarioActual.id) {
        await Swal.fire({
            icon: "warning",
            title: "No puede eliminar su cuenta",
            text: "No puede eliminar el usuario con el que tiene iniciada la sesión.",
            confirmButtonText: "Aceptar"
        });
        return;
    }
    const resultado = await Swal.fire({
        icon: "warning",
        title: "¿Eliminar usuario?",
        html: `
            ¿Está seguro de que desea eliminar al usuario
            <strong>${escapeHtml(usuario.nombre_usuario)}</strong>?
        `,
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar",
        reverseButtons: true
    });
    if (!resultado.isConfirmed) {
        return;
    }
    // Solicitar nuevamente la contraseña del administrador.
    const contrasenaActual = await solicitarContrasenaAdministrador();
    if (contrasenaActual === null) {
        return;
    }
    await eliminarUsuario(usuario.id_usuario, contrasenaActual);
}
async function eliminarUsuario(idUsuario, contrasenaActual) {
    try {
        const respuesta = await fetch(`/api/usuarios/${idUsuario}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include",
            body: JSON.stringify({
                contrasena_actual: contrasenaActual
            })
        });
        const datos = await respuesta.json();
        if (!respuesta.ok) {
            if (respuesta.status === 401) {
                throw new Error("La contraseña de administrador es incorrecta.");
            }
            if (respuesta.status === 400) {
                throw new Error(datos.mensaje || "No se puede eliminar este usuario.");
            }
            if (respuesta.status === 404) {
                throw new Error(datos.mensaje || "El usuario que desea eliminar no existe.");
            }
            throw new Error(datos.mensaje || "No se pudo eliminar el usuario.");
        }
        await Swal.fire({
            icon: "success",
            title: "Usuario eliminado",
            text: "El usuario se eliminó correctamente.",
            confirmButtonText: "Aceptar"
        });
        await cargarUsuarios();
        // Mantener los filtros después de recargar.
        aplicarFiltros();
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        await Swal.fire({
            icon: "error",
            title: "Error",
            text: error.message || "No se pudo eliminar el usuario.",
            confirmButtonText: "Aceptar"
        });
    }
}

function escapeHtml(texto) {
    const div = document.createElement("div");
    div.textContent = texto ?? "";
    return div.innerHTML;
}
document.addEventListener("DOMContentLoaded", cargarVista);
