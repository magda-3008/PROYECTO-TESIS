async function solicitarContrasenaAdministrador() {

    const resultado = await Swal.fire({
        icon: "warning",
        title: "Confirmar identidad",
        text: "Para continuar, ingrese su contraseña de administrador.",
        input: "password",
        inputPlaceholder: "Contraseña de administrador",
        inputAttributes: {
            autocomplete: "current-password"
        },
        showCancelButton: true,
        confirmButtonText: "Continuar",
        cancelButtonText: "Cancelar",
        reverseButtons: true,
        allowOutsideClick: false,
        allowEscapeKey: true,
        inputValidator: (valor) => {
            if (!valor || !valor.trim()) {
                return "Debe ingresar su contraseña.";
            }

            return undefined;
        }
    });

    if (!resultado.isConfirmed) {
        return null;
    }

    return resultado.value;
}