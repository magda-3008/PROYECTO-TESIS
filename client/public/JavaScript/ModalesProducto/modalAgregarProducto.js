document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("contenedorModalAgregarProducto");
    const btnAgregarProducto = document.getElementById("btnAgregarProducto");
    if (!contenedor) {
        console.error(
            "No se encontró el contenedor #contenedorModalAgregarProducto",
        );
        return;
    }
    if (!btnAgregarProducto) {
        console.error("No se encontró el botón #btnAgregarProducto");
        return;
    }
    try {
        const respuesta = await fetch("agregar-producto.html");
        if (!respuesta.ok) {
            throw new Error(
                `No se pudo cargar agregar-producto.html (${respuesta.status})`,
            );
        }
        const html = await respuesta.text();
        contenedor.innerHTML = html;
        const modalElemento = document.getElementById("modalAgregarProducto");
        const tipoProducto = document.getElementById("tipoProducto");
        const seccionReventa = document.getElementById("seccionReventa");
        const seccionElaborado = document.getElementById("seccionElaborado");
        const costoCompra = document.getElementById("costoCompra");
        const imagenProducto = document.getElementById("imagenProducto");
        const vistaPreviaImagen = document.getElementById("vistaPreviaImagen");
        if (imagenProducto && vistaPreviaImagen) {
            imagenProducto.addEventListener("change", () => {
                const archivo = imagenProducto.files[0];
                if (!archivo) {
                    vistaPreviaImagen.innerHTML = `
                <div class="text-muted">
                    <i class="fa-solid fa-image fa-2x mb-2"></i>
                    <div>Sin imagen</div>
                </div>
            `;
                    return;
                }
                const urlImagen = URL.createObjectURL(archivo);
                vistaPreviaImagen.innerHTML = `
            <img 
                src="${urlImagen}" 
                alt="Vista previa"
                class="img-fluid rounded"
                style="max-height: 135px; object-fit: contain;"
            >
        `;
            });
        }
        if (!modalElemento) {
            console.error("No se encontró #modalAgregarProducto");
            return;
        }
        if (!tipoProducto) {
            console.error("No se encontró #tipoProducto");
            return;
        }
        if (!seccionReventa || !seccionElaborado) {
            console.error("No se encontraron las secciones de Reventa o Elaborado");
            return;
        }
        const modalAgregarProducto = new bootstrap.Modal(modalElemento);


        function llenarSelectMateriaPrima(select, materiasPrimas) {

            select.innerHTML = `
        <option value="" selected disabled>
            Seleccione una materia prima
        </option>
    `;

            materiasPrimas.forEach(materia => {

                const opcion = document.createElement("option");

                opcion.value = materia.id_ma;
                opcion.textContent = materia.nombre;

                opcion.dataset.unidadMedida = materia.unidad_medida;
                opcion.dataset.unidadPorPaquete = materia.unidad_por_paquete;
                opcion.dataset.unidadExistencia = materia.unidad_existencia;

                select.appendChild(opcion);
            });

            const opcionNueva = document.createElement("option");

            opcionNueva.value = "__nueva_materia_prima__";
            opcionNueva.textContent = "+ Agregar nueva materia prima";

            select.appendChild(opcionNueva);
        }

        function actualizarTipoProducto() {
            const tipo = tipoProducto.value;
            if (tipo === "Reventa") {
                seccionReventa.classList.remove("d-none");
                seccionElaborado.classList.add("d-none");
                // El costo de compra vuelve a estar disponible
                if (costoCompra) {
                    costoCompra.disabled = false;
                }
            } else if (tipo === "Elaborado") {
                seccionReventa.classList.add("d-none");
                seccionElaborado.classList.remove("d-none");
                // Deshabilitamos el costo de compra
                // porque los elaborados no lo utilizan
                if (costoCompra) {
                    costoCompra.disabled = true;
                    costoCompra.value = "";
                }
            } else {
                seccionReventa.classList.add("d-none");
                seccionElaborado.classList.add("d-none");
            }
        }

        async function cargarMateriasPrimas() {

            try {

                const respuesta = await fetch("/api/materiaprima");

                if (!respuesta.ok) {
                    throw new Error("No se pudieron cargar las materias primas.");
                }

                const materiasPrimas = await respuesta.json();

                console.log("Materias primas cargadas:", materiasPrimas);

                // Guardamos la lista para utilizarla
                // cuando agreguemos nuevas filas
                window.materiasPrimas = materiasPrimas;

                const selects = document.querySelectorAll(".ingrediente-select");

                selects.forEach(select => {
                    llenarSelectMateriaPrima(select, materiasPrimas);
                });

            } catch (error) {

                console.error("Error al cargar materias primas:", error);

                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text: "No se pudieron cargar las materias primas."
                });
            }
        }

        tipoProducto.addEventListener("change", actualizarTipoProducto);
        btnAgregarProducto.addEventListener("click", () => {
            modalAgregarProducto.show();
        });
        const listaIngredientes = document.getElementById("listaIngredientes");
        const btnAgregarIngrediente = document.getElementById("agregarIngrediente");
        await cargarMateriasPrimas();
        if (listaIngredientes && btnAgregarIngrediente) {
            btnAgregarIngrediente.addEventListener("click", () => {
                // Crear una nueva fila
                const nuevaFila = document.createElement("div");
                nuevaFila.classList.add("row", "g-2", "mb-2", "ingrediente-row");
                nuevaFila.innerHTML = `
                    <div class="col-md-7">
                        <div class="campo">
                            <label>Materia prima</label>

                            <select class="form-select ingrediente-select">
                                <option value="" selected disabled>
                                    Seleccione una materia prima
                                </option>

                                <option value="__nueva_materia_prima__">
                                    + Agregar nueva materia prima
                                </option>
                            </select>
                        </div>
                    </div>

                    <div class="col-md-2">
                        <div class="campo">
                            <label>Cantidad</label>

                            <input
                                type="number"
                                class="form-control cantidad-ingrediente"
                                min="0"
                                step="0.01"
                                placeholder="Cantidad"
                            >
                        </div>
                    </div>

                    <div class="col-md-2">
                        <div class="campo">
                            <label>Unidad</label>

                            <select
                                class="form-select unidad-ingrediente"
                                disabled
                            >
                                <option value="" selected>
                                    Seleccione
                                </option>
                            </select>
                        </div>
                    </div>

                    <div class="col-md-1">
                        <button
                            type="button"
                            class="btn btn-danger w-100 btnEliminarIngrediente"
                            title="Eliminar ingrediente"
                            style="height: 48px; border-radius: 12px"
                        >
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                `;

                const nuevoSelect = nuevaFila.querySelector(".ingrediente-select");

                llenarSelectMateriaPrima(
                    nuevoSelect,
                    window.materiasPrimas || []
                );

                // Agregar la nueva fila al contenedor
                listaIngredientes.appendChild(nuevaFila);
            });
            listaIngredientes.addEventListener("click", (evento) => {
                const botonEliminar = evento.target.closest(".btnEliminarIngrediente");
                if (!botonEliminar) {
                    return;
                }
                const fila = botonEliminar.closest(".ingrediente-row");
                if (fila) {
                    fila.remove();
                }
            });
        }
        // =========================================
        // GUARDAR PRODUCTO
        // =========================================
        const formularioProducto = document.getElementById("formAgregarProducto");
        const btnGuardarProducto = document.getElementById("guardarProducto");
        if (formularioProducto && btnGuardarProducto) {
            btnGuardarProducto.addEventListener("click", async () => {
                // Limpiar errores anteriores
                formularioProducto.querySelectorAll(".is-invalid").forEach((campo) => {
                    campo.classList.remove("is-invalid");
                });
                let formularioValido = true;
                const nombreProducto = document.getElementById("nombreProducto");
                if (!nombreProducto.value.trim()) {
                    nombreProducto.classList.add("is-invalid");
                    formularioValido = false;
                }
                const tipoProducto = document.getElementById("tipoProducto");
                if (!tipoProducto.value) {
                    tipoProducto.classList.add("is-invalid");
                    formularioValido = false;
                }
                const precioVenta = document.getElementById("precioVenta");
                if (!precioVenta.value || Number(precioVenta.value) <= 0) {
                    precioVenta.classList.add("is-invalid");
                    formularioValido = false;
                }
                const margenGanancia = document.getElementById("margenGanancia");
                if (
                    !margenGanancia.value ||
                    Number(margenGanancia.value) < 0 ||
                    Number(margenGanancia.value) > 100
                ) {
                    margenGanancia.classList.add("is-invalid");
                    formularioValido = false;
                }
                const stockInicial = document.getElementById("stockInicial");
                if (!stockInicial.value || Number(stockInicial.value) < 0) {
                    stockInicial.classList.add("is-invalid");
                    formularioValido = false;
                }
                if (tipoProducto.value === "Reventa") {
                    const costoCompra = document.getElementById("costoCompra");
                    if (!costoCompra.value || Number(costoCompra.value) <= 0) {
                        costoCompra.classList.add("is-invalid");
                        formularioValido = false;
                    }
                }
                if (!formularioValido) {
                    Swal.fire({
                        icon: "warning",
                        title: "Datos incompletos",
                        text: "Por favor, complete correctamente los campos obligatorios.",
                    });
                    return;
                }
                const formData = new FormData();
                formData.append("nombre", nombreProducto.value.trim());
                formData.append("tipo", tipoProducto.value);
                formData.append("precio_venta", Number(precioVenta.value));
                formData.append(
                    "margen_gananciab_esperado",
                    Number(margenGanancia.value),
                );
                formData.append("stock_inicial", Number(stockInicial.value));
                if (tipoProducto.value === "Reventa") {
                    formData.append(
                        "costo_compra",
                        Number(document.getElementById("costoCompra").value),
                    );
                }
                // Agregar imagen solamente si el usuario seleccionó una
                const imagenProducto = document.getElementById("imagenProducto");
                if (imagenProducto && imagenProducto.files.length > 0) {
                    formData.append("foto", imagenProducto.files[0]);
                }
                console.log("Enviando producto...");
                try {
                    const respuesta = await fetch("/api/productos", {
                        method: "POST",
                        body: formData,
                    });
                    const resultado = await respuesta.json();
                    console.log("Respuesta del servidor:", resultado);
                    if (!respuesta.ok) {
                        throw new Error(resultado.error || "No se pudo crear el producto.");
                    }
                    await Swal.fire({
                        icon: "success",
                        title: "Producto agregado",
                        text: "El producto de reventa se creó correctamente.",
                        confirmButtonText: "Aceptar",
                    });
                    modalAgregarProducto.hide();
                    await cargarVista();
                } catch (error) {
                    console.error("Error al crear producto:", error);
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: error.message,
                    });
                }
            });
        }
        modalElemento.addEventListener("hidden.bs.modal", () => {
            const formulario = document.getElementById("formAgregarProducto");
            if (formulario) {
                formulario.reset();
            }
            // Restaurar vista previa
            if (vistaPreviaImagen) {
                vistaPreviaImagen.innerHTML = `
            <div class="text-muted">
                <i class="fa-solid fa-image fa-2x mb-2"></i>
                <div>Sin imagen</div>
            </div>
        `;
            }
            // Ocultar ambas secciones
            seccionReventa.classList.add("d-none");
            seccionElaborado.classList.add("d-none");
        });
    } catch (error) {
        console.error("Error al cargar el modal de agregar producto:", error);
    }
});
