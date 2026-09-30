document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("contenedorModalAgregarMP");
    const btnAgregarMP = document.getElementById("btnAgregarMP");
    if (!contenedor) {
        console.error("No se encontró el contenedor #contenedorModalAgregarMP");
        return;
    }
    if (!btnAgregarMP) {
        console.error("No se encontró el botón #btnAgregarMP");
        return;
    }
    try {
        const respuesta = await fetch("agregar-materiaprima.html");
        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar el modal (${respuesta.status})`);
        }
        const html = await respuesta.text();
        contenedor.innerHTML = html;
        const modalElemento = document.getElementById("modalAgregarMP");
        const formularioMP = document.getElementById("formAgregarMP");
        const nombreMP = document.getElementById("nombreMP");
        const costoInsumo = document.getElementById("costoInsumo");
        const unidadMedidaMP = document.getElementById("unidadMedidaMP");
        const unidadExistenciaMP = document.getElementById("unidadExistenciaMP");
        const unidadPorPaqueteMP = document.getElementById("unidadPorPaqueteMP");
        const stockInicialMP = document.getElementById("stockInicialMP");
        const stockMinimoMP = document.getElementById("stockMinimoMP");
        const btnGuardarMP = document.getElementById("guardarMP");
        const spinnerGuardarMP = document.getElementById("spinnerGuardarMP");
        const textoGuardarMP = document.getElementById("textoGuardarMP");
        if (!modalElemento) {
            console.error("No se encontró #modalAgregarMP");
            return;
        }
        if (!formularioMP) {
            console.error("No se encontró #formAgregarMP");
            return;
        }
        if (!btnGuardarMP) {
            console.error("No se encontró #guardarMP");
            return;
        }
        const modalAgregarMP = new bootstrap.Modal(modalElemento);
        async function cargarUnidades() {
            try {
                const respuesta = await fetch("/api/materiaprima");
                if (!respuesta.ok) {
                    throw new Error("No se pudieron cargar las unidades.");
                }
                const materias = await respuesta.json();
                const unidadesMedida = [...new Set(materias.map(materia => materia.unidad_medida).filter(unidad => unidad))];
                const unidadesExistencia = [...new Set(materias.map(materia => materia.unidad_existencia).filter(unidad => unidad))];
                unidadesMedida.sort(
                    (a, b) => a.localeCompare(b));
                unidadesExistencia.sort(
                    (a, b) => a.localeCompare(b));
                unidadMedidaMP.innerHTML = `
                    <option value="" selected disabled>
                        Seleccione
                    </option>
                `;
                unidadExistenciaMP.innerHTML = `
                    <option value="" selected disabled>
                        Seleccione
                    </option>
                `;
                unidadesMedida.forEach(unidad => {
                    const opcion = document.createElement("option");
                    opcion.value = unidad;
                    opcion.textContent = unidad;
                    unidadMedidaMP.appendChild(opcion);
                });
                unidadesExistencia.forEach(unidad => {
                    const opcion = document.createElement("option");
                    opcion.value = unidad;
                    opcion.textContent = unidad;
                    unidadExistenciaMP.appendChild(opcion);
                });
            } catch (error) {
                console.error("Error al cargar unidades:", error);
                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "No se pudieron cargar las unidades."
                });
            }
        }

        btnAgregarMP.addEventListener("click", async () => {
            await cargarUnidades();
            modalAgregarMP.show();
        });
        btnGuardarMP.addEventListener("click", async () => {
            formularioMP.querySelectorAll(".is-invalid").forEach(campo => {
                campo.classList.remove("is-invalid");
            });
            let formularioValido = true;
            if (!nombreMP.value.trim()) {
                nombreMP.classList.add("is-invalid");
                formularioValido = false;
            }
            if (!costoInsumo.value || Number(costoInsumo.value) <= 0) {
                costoInsumo.classList.add("is-invalid");
                formularioValido = false;
            }
            if (!unidadMedidaMP.value) {
                unidadMedidaMP.classList.add("is-invalid");
                formularioValido = false;
            }
            if (!unidadExistenciaMP.value) {
                unidadExistenciaMP.classList.add("is-invalid");
                formularioValido = false;
            }
            if (!unidadPorPaqueteMP.value || Number(unidadPorPaqueteMP.value) <= 0) {
                unidadPorPaqueteMP.classList.add("is-invalid");
                formularioValido = false;
            }
            if (!stockInicialMP.value || Number(stockInicialMP.value) < 0) {
                stockInicialMP.classList.add("is-invalid");
                formularioValido = false;
            }
            let stockMinimoNormalizado = null;

            if (stockMinimoMP.value.trim() !== "") {

                stockMinimoNormalizado = parsearCantidad(
                    stockMinimoMP.value.trim()
                );

                if (
                    !Number.isFinite(stockMinimoNormalizado) ||
                    stockMinimoNormalizado < 0
                ) {
                    stockMinimoMP.classList.add("is-invalid");
                    formularioValido = false;
                }
            }
            if (!formularioValido) {
                Swal.fire({
                    icon: "warning",
                    title: "Datos incompletos",
                    text: "Por favor, complete correctamente los campos obligatorios."
                });
                return;
            }
            btnGuardarMP.disabled = true;
            if (spinnerGuardarMP) {
                spinnerGuardarMP.classList.remove("d-none");
            }
            if (textoGuardarMP) {
                textoGuardarMP.textContent = "Guardando...";
            }
            const datosMP = {
                nombre: nombreMP.value.trim(),
                unidad_medida: unidadMedidaMP.value,
                costo_total_ingrediente: Number(costoInsumo.value),
                unidad_por_paquete: Number(unidadPorPaqueteMP.value),
                stock_actual_i: Number(stockInicialMP.value),
                stock_minimo: stockMinimoNormalizado,
                unidad_existencia: unidadExistenciaMP.value
            };

            try {
                const respuesta = await fetch(
                    "/api/materiaprima",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(datosMP)
                    }
                );
                const resultado = await respuesta.json();
                console.log("Respuesta del servidor:", resultado);

                if (!respuesta.ok) {
                    throw new Error(resultado.error || "No se pudo crear la materia prima.");
                }

                await Swal.fire({
                    icon: "success",
                    title: "Materia prima agregada",
                    text: "La materia prima se creó correctamente.",
                    confirmButtonText: "Aceptar"
                });
                modalAgregarMP.hide();
                if (typeof tablaMD !== "undefined" && tablaMD && resultado.materiaPrima) {
                    tablaMD.addData(
                        [
                            resultado.materiaPrima
                        ], true);
                }
            } catch (error) {
                console.error("Error al crear materia prima:", error);
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
                btnGuardarMP.disabled = false;
                if (spinnerGuardarMP) {
                    spinnerGuardarMP.classList.add("d-none");
                }
                if (textoGuardarMP) {
                    textoGuardarMP.textContent = "Guardar";
                }
            }
        });
        modalElemento.addEventListener("hidden.bs.modal",
            () => {
                formularioMP.reset();
                formularioMP.querySelectorAll(".is-invalid").forEach(campo => {
                    campo.classList.remove("is-invalid");
                });
                // Restaurar botón
                btnGuardarMP.disabled = false;
                if (spinnerGuardarMP) {
                    spinnerGuardarMP.classList.add("d-none");
                }
                if (textoGuardarMP) {
                    textoGuardarMP.textContent = "Guardar";
                }
            });
    } catch (error) {
        console.error("Error al cargar el modal de agregar materia prima:", error);
    }
});
