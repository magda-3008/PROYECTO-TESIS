let materiaPrimaEnEdicion = null;
let filaMateriaPrimaEnEdicion = null;
document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("contenedorModalEditarMP");
    if (!contenedor) {
        console.error("No se encontró el contenedor #contenedorModalEditarMP");
        return;
    }
    try {
        const respuesta = await fetch(
            "editar-materiaprima.html",
            {
                credentials: "include"
            }
        );
        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar el modal (${respuesta.status})`);
        }
        const html = await respuesta.text();
        contenedor.innerHTML = html;
        const modalElemento = document.getElementById("modalEditarMateriaPrima");
        const formulario = document.getElementById("formEditarMateriaPrima");
        const nombre = document.getElementById("editarNombreMateriaPrima");
        const unidadMedida = document.getElementById("editarUnidadMedidaMateriaPrima");
        const cantidadPresentacion = document.getElementById("editarCantidadPresentacionMateriaPrima");
        const costo = document.getElementById("editarCostoMateriaPrima");
        const stockMinimo = document.getElementById("editarStockMinimoMateriaPrima");
        const unidadStockMinimo = document.getElementById("unidadStockMinimoMateriaPrima");
        const btnGuardar = document.getElementById("btnGuardarEdicionMateriaPrima");
        const spinnerGuardar = document.getElementById("spinnerGuardarEdicionMateriaPrima");
        const textoGuardar = document.getElementById("textoGuardarEdicionMateriaPrima");
        if (!modalElemento) {
            console.error("No se encontró #modalEditarMateriaPrima");
            return;
        }
        if (!formulario) {
            console.error("No se encontró #formEditarMateriaPrima");
            return;
        }
        if (!btnGuardar) {
            console.error("No se encontró #btnGuardarEdicionMateriaPrima");
            return;
        }
        const modalEditarMP = new bootstrap.Modal(modalElemento);
        /*
         * Convierte el stock mínimo normalizado de la BD
         * a la unidad de existencia utilizada por el usuario.
         */

        function convertirStockMinimoAUnidadHumana(materiaPrima) {

            const stock = Number(materiaPrima.stock_minimo);

            const unidadMedida = String(
                materiaPrima.unidad_medida || ""
            ).trim();

            const unidadExistencia = String(
                materiaPrima.unidad_existencia || ""
            ).trim();

            const unidadPorPaquete = Number(
                materiaPrima.unidad_por_paquete
            );

            if (!Number.isFinite(stock)) {
                return "";
            }

            // Si ambas unidades son iguales,
            // el valor almacenado ya está en la unidad que verá el usuario.
            if (
                unidadMedida.toLowerCase() ===
                unidadExistencia.toLowerCase()
            ) {
                return formatearCantidadParaInput(stock);
            }

            // Si existe una equivalencia de presentación,
            // convertimos de la unidad almacenada a la unidad humana.
            if (
                !Number.isFinite(unidadPorPaquete) ||
                unidadPorPaquete <= 0
            ) {
                return formatearCantidadParaInput(stock);
            }

            const cantidadHumana = stock / unidadPorPaquete;

            return formatearCantidadParaInput(cantidadHumana);
        }


        function formatearCantidadParaInput(cantidad) {

            const numero = Number(cantidad);

            if (!Number.isFinite(numero)) {
                return "";
            }

            const valor = limpiarDecimal(numero);

            // Números enteros
            if (Number.isInteger(valor)) {
                return String(valor);
            }

            const entero = Math.floor(valor);
            const decimal = limpiarDecimal(valor - entero);

            // Fracciones sencillas
            if (decimal === 0.25) {
                return entero === 0
                    ? "1/4"
                    : `${entero} 1/4`;
            }

            if (decimal === 0.5) {
                return entero === 0
                    ? "1/2"
                    : `${entero} 1/2`;
            }

            if (decimal === 0.75) {
                return entero === 0
                    ? "3/4"
                    : `${entero} 3/4`;
            }

            // Si no corresponde a una fracción sencilla,
            // conserva el valor decimal.
            return String(valor);
        }

        /*
         * Abre el modal con la materia prima seleccionada.
         */
        window.abrirModalEditarMP = function (materiaPrima, fila) {
            materiaPrimaEnEdicion = materiaPrima;
            filaMateriaPrimaEnEdicion = fila;
            formulario.reset();
            formulario.querySelectorAll(".is-invalid").forEach(campo => {
                campo.classList.remove("is-invalid");
            });
            document.querySelectorAll(".error-msg").forEach(error => {
                error.textContent = "";
            });
            nombre.value = materiaPrima.nombre || "";
            unidadMedida.value = materiaPrima.unidad_medida || "";
            cantidadPresentacion.value = materiaPrima.unidad_por_paquete ?? "";
            costo.value = materiaPrima.costo_total_ingrediente ?? "";
            unidadStockMinimo.textContent = materiaPrima.unidad_existencia || "";
            stockMinimo.value = convertirStockMinimoAUnidadHumana(materiaPrima);
            modalEditarMP.show();
        };
        btnGuardar.addEventListener("click", async () => {
            formulario.querySelectorAll(".is-invalid").forEach(campo => {
                campo.classList.remove("is-invalid");
            });
            document.querySelectorAll(".error-msg").forEach(error => {
                error.textContent = "";
            });
            let formularioValido = true;
            /*
             * Validar nombre
             */
            if (!nombre.value.trim()) {
                nombre.classList.add("is-invalid");
                document.getElementById("errorNombreMateriaPrima").textContent = "El nombre del insumo es obligatorio.";
                formularioValido = false;
            }
            /*
             * Validar costo
             */
            if (!costo.value || Number(costo.value) <= 0) {
                costo.classList.add("is-invalid");
                document.getElementById("errorCostoMateriaPrima").textContent = "El costo debe ser mayor que 0.";
                formularioValido = false;
            }
            /*
             * Validar stock mínimo
             */
            let stockMinimoNumero = parsearCantidad(stockMinimo.value);

            if (
                !Number.isFinite(stockMinimoNumero) ||
                stockMinimoNumero < 0
            ) {

                stockMinimo.classList.add("is-invalid");

                document.getElementById(
                    "errorStockMinimoMateriaPrima"
                ).textContent =
                    "Ingrese una cantidad válida. Ejemplos: 1, 1/2 o 1 1/2.";

                formularioValido = false;
            }
            if (!formularioValido) {
                Swal.fire({
                    icon: "warning",
                    title: "Datos incorrectos",
                    text: "Por favor, revise los campos marcados."
                });
                return;
            }
            btnGuardar.disabled = true;
            if (spinnerGuardar) {
                spinnerGuardar.classList.remove("d-none");
            }
            if (textoGuardar) {
                textoGuardar.textContent = "Guardando...";
            }
            const datos = {
                nombre: nombre.value.trim(),
                costo_total_ingrediente: Number(costo.value),
                stock_minimo: stockMinimoNumero
            };
            try {
                const respuesta = await fetch(`/api/materiaprima/${materiaPrimaEnEdicion.id_ma}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(datos)
                });
                if (!respuesta.ok) {
                    await manejarErrorRespuesta(
                        respuesta,
                        "No se pudo actualizar la materia prima."
                    );
                    return;
                }

                const resultado = await respuesta.json();
                await Swal.fire({
                    icon: "success",
                    title: "Materia prima actualizada",
                    text: "Los cambios se guardaron correctamente.",
                    confirmButtonText: "Aceptar"
                });
                modalEditarMP.hide();

                if (filaMateriaPrimaEnEdicion) {
                    filaMateriaPrimaEnEdicion.update(resultado.materiaPrima);
                }
            } catch (error) {
                console.error("Error al actualizar materia prima:", error);
                const mensajeError = error.message.toLowerCase();
                if (mensajeError.includes("timed out") || mensajeError.includes("timeout") || mensajeError.includes("timedout")) {
                    Swal.fire({
                        icon: "error",
                        title: "No se pudo guardar la materia prima",
                        text: "La conexión tardó demasiado en responder. Verifique su conexión e inténtelo nuevamente.",
                        confirmButtonText: "Aceptar"
                    });
                } else {
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: error.message
                    });
                }
            } finally {
                btnGuardar.disabled = false;
                if (spinnerGuardar) {
                    spinnerGuardar.classList.add("d-none");
                }
                if (textoGuardar) {
                    textoGuardar.textContent = "Guardar cambios";
                }
            }
        });
        /*
         * Restaurar el modal al cerrarlo.
         */
        modalElemento.addEventListener("hidden.bs.modal",
            () => {
                formulario.reset();
                formulario.querySelectorAll(".is-invalid").forEach(campo => {
                    campo.classList.remove("is-invalid");
                });
                document.querySelectorAll(".error-msg").forEach(error => {
                    error.textContent = "";
                });
                unidadStockMinimo.textContent = "";
                materiaPrimaEnEdicion = null;
                filaMateriaPrimaEnEdicion = null;
                btnGuardar.disabled = false;
                if (spinnerGuardar) {
                    spinnerGuardar.classList.add("d-none");
                }
                if (textoGuardar) {
                    textoGuardar.textContent = "Guardar cambios";
                }
            });
    } catch (error) {
        console.error("Error al cargar el modal de editar materia prima:", error);
    }
});
