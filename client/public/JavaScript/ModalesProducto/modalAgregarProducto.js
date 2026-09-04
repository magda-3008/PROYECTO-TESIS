document.addEventListener("DOMContentLoaded", async () => {
    const contenedor = document.getElementById("contenedorModalAgregarProducto");
    const btnAgregarProducto = document.getElementById("btnAgregarProducto");
    if (!contenedor) {
        console.error("No se encontró el contenedor #contenedorModalAgregarProducto");
        return;
    }
    if (!btnAgregarProducto) {
        console.error("No se encontró el botón #btnAgregarProducto");
        return;
    }
    try {
        const respuesta = await fetch("agregar-producto.html");
        if (!respuesta.ok) {
            throw new Error(`No se pudo cargar agregar-producto.html (${respuesta.status})`);
        }
        const html = await respuesta.text();
        contenedor.innerHTML = html;
        const modalElemento = document.getElementById("modalAgregarProducto");
        const tipoProducto = document.getElementById("tipoProducto");
        const seccionReventa = document.getElementById("seccionReventa");
        const seccionElaborado = document.getElementById("seccionElaborado");
        const costoCompra = document.getElementById("costoCompra");
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
        tipoProducto.addEventListener("change", actualizarTipoProducto);
        btnAgregarProducto.addEventListener("click",
            () => {
                modalAgregarProducto.show();
            });
        const listaIngredientes = document.getElementById("listaIngredientes");
        const btnAgregarIngrediente = document.getElementById("agregarIngrediente");
        if (listaIngredientes && btnAgregarIngrediente) {
            btnAgregarIngrediente.addEventListener("click",
                () => {
                    // Crear una nueva fila
                    const nuevaFila = document.createElement("div");
                    nuevaFila.classList.add("row", "g-2", "mb-2", "ingrediente-row");
                    nuevaFila.innerHTML = `
                <div class="col-md-7">
                    <select class="form-select ingrediente-select">
                        <option value="" selected disabled>
                            Seleccione una materia prima
                        </option>

                        <option value="__nueva_materia_prima__">
                            + Agregar nueva materia prima
                        </option>
                    </select>
                </div>

                <div class="col-md-3">
                    <input
                        type="number"
                        class="form-control cantidad-ingrediente"
                        placeholder="Cantidad"
                        min="0"
                        step="0.01"
                    >
                </div>

                <div class="col-md-2">
                    <button
                        type="button"
                        class="btn btn-danger w-100 btnEliminarIngrediente"
                        title="Eliminar ingrediente"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
                    // Agregar la nueva fila al contenedor
                    listaIngredientes.appendChild(nuevaFila);
                });
            listaIngredientes.addEventListener("click",
                (evento) => {
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
            btnGuardarProducto.addEventListener("click",
                () => {
                    // Limpiar errores anteriores
                    formularioProducto.querySelectorAll(".is-invalid").forEach((campo) => {
                        campo.classList.remove("is-invalid");
                    });
                    let formularioValido = true;
                    // =========================================
                    // NOMBRE
                    // =========================================
                    const nombreProducto = document.getElementById("nombreProducto");
                    if (!nombreProducto.value.trim()) {
                        nombreProducto.classList.add("is-invalid");
                        formularioValido = false;
                    }
                    // =========================================
                    // TIPO
                    // =========================================
                    const tipoProducto = document.getElementById("tipoProducto");
                    if (!tipoProducto.value) {
                        tipoProducto.classList.add("is-invalid");
                        formularioValido = false;
                    }
                    // =========================================
                    // PRECIO DE VENTA
                    // =========================================
                    const precioVenta = document.getElementById("precioVenta");
                    if (!precioVenta.value || Number(precioVenta.value) <= 0) {
                        precioVenta.classList.add("is-invalid");
                        formularioValido = false;
                    }
                    // =========================================
                    // MARGEN DE GANANCIA
                    // =========================================
                    const margenGanancia = document.getElementById("margenGanancia");
                    if (!margenGanancia.value || Number(margenGanancia.value) < 0 || Number(margenGanancia.value) > 100) {
                        margenGanancia.classList.add("is-invalid");
                        formularioValido = false;
                    }
                    // =========================================
                    // STOCK INICIAL
                    // =========================================
                    const stockInicial = document.getElementById("stockInicial");
                    if (!stockInicial.value || Number(stockInicial.value) < 0) {
                        stockInicial.classList.add("is-invalid");
                        formularioValido = false;
                    }
                    // =========================================
                    // REVENTA
                    // =========================================
                    if (tipoProducto.value === "Reventa") {
                        const costoCompra = document.getElementById("costoCompra");
                        if (!costoCompra.value || Number(costoCompra.value) <= 0) {
                            costoCompra.classList.add("is-invalid");
                            formularioValido = false;
                        }
                    }
                    // =========================================
                    // RESULTADO
                    // =========================================
                    if (!formularioValido) {
                        Swal.fire({
                            icon: "warning",
                            title: "Datos incompletos",
                            text: "Por favor, complete correctamente los campos obligatorios."
                        });
                        return;
                    }
                    // Por ahora solamente mostramos los datos
                    // para comprobar que todo está funcionando.
                    console.log("Producto válido:");
                    console.log({
                        nombre: nombreProducto.value.trim(),
                        tipo: tipoProducto.value,
                        precioVenta: Number(precioVenta.value),
                        margenGanancia: Number(margenGanancia.value),
                        stockInicial: Number(stockInicial.value),
                        costoCompra: tipoProducto.value === "Reventa" ? Number(document.getElementById("costoCompra").value) : null
                    });
                });
        }
        modalElemento.addEventListener("hidden.bs.modal",
            () => {
                const formulario = document.getElementById("formAgregarProducto");
                if (formulario) {
                    formulario.reset();
                }
                // Ocultar ambas secciones
                seccionReventa.classList.add("d-none");
                seccionElaborado.classList.add("d-none");
            });
    } catch (error) {
        console.error("Error al cargar el modal de agregar producto:", error);
    }
});
