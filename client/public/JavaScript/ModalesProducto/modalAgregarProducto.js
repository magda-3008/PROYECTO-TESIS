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
        const imagenProducto = document.getElementById("imagenProducto");

        const nombreProducto = document.getElementById(
            "nombreProducto"
        );

        const nombreReceta = document.getElementById(
            "nombreReceta"
        );

        const stockInicial = document.getElementById(
            "stockInicial"
        );

        const cantidadProducidaBase = document.getElementById(
            "cantidadProducidaBase"
        );

        const vistaPreviaImagen = document.getElementById("vistaPreviaImagen");
        const listaIngredientes = document.getElementById("listaIngredientes");
        const btnAgregarIngrediente = document.getElementById("agregarIngrediente");
        const formularioProducto = document.getElementById("formAgregarProducto");
        const btnGuardarProducto = document.getElementById("guardarProducto");
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
        let materiasPrimas = [];
        let productosElaborados = [];

        function llenarSelectMateriaPrima(select, materias) {

            select.innerHTML = `
        <option value="" selected disabled>
            Seleccione una materia prima
        </option>
    `;

            materias.forEach((materia) => {

                const opcion = document.createElement("option");

                opcion.value = materia.id_ma;
                opcion.textContent = materia.nombre;

                // Información de la materia prima
                opcion.dataset.unidadMedida =
                    materia.unidad_medida || "";

                opcion.dataset.unidadPorPaquete =
                    materia.unidad_por_paquete || "";

                opcion.dataset.unidadExistencia =
                    materia.unidad_existencia || "";

                select.appendChild(opcion);
            });

            // Opción para crear nueva materia prima
            const opcionNueva = document.createElement("option");

            opcionNueva.value = "__nueva_materia_prima__";
            opcionNueva.textContent =
                "+ Agregar nueva materia prima";

            select.appendChild(opcionNueva);

            select.disabled = false;
        }

        function llenarSelectProductoElaborado(select, productos) {

            select.innerHTML = `
        <option value="" selected disabled>
            Seleccione un producto elaborado
        </option>
    `;

            productos.forEach((producto) => {

                const opcion = document.createElement("option");

                opcion.value = producto.id_producto;
                opcion.textContent = producto.nombre;

                select.appendChild(opcion);
            });

            select.disabled = false;
        }

        function obtenerUnidadesDisponibles(unidadMedida, nombreInsumo) {
            const unidad = unidadMedida?.trim().toLowerCase() || "";
            const nombre = nombreInsumo?.trim().toLowerCase() || "";
            let unidades = [];
            if (unidad === "mililitros" || unidad === "mililitro") {
                unidades = [{
                    valor: "mililitro",
                    texto: "Mililitro"
                }, {
                    valor: "cucharada",
                    texto: "Cucharada"
                }];
            } else if (unidad === "gramos" || unidad === "gramo") {
                unidades = [{
                    valor: "gramo",
                    texto: "Gramo"
                }];
            } else if (unidad === "libra" || unidad === "libras") {
                unidades = [{
                    valor: "libra",
                    texto: "Libra"
                }, {
                    valor: "cucharada",
                    texto: "Cucharada"
                }];
            } else if (unidad === "litro" || unidad === "litros") {
                unidades = [{
                    valor: "litro",
                    texto: "Litro"
                }, {
                    valor: "taza",
                    texto: "Taza"
                }];
            } else if (unidad === "unidad" || unidad === "unidad(es)") {
                unidades = [{
                    valor: "unidad",
                    texto: "Unidad"
                }];
            } else if (unidad === "paquete" || unidad === "bolsa") {
                unidades = [{
                    valor: unidad,
                    texto: unidad.charAt(0).toUpperCase() + unidad.slice(1)
                }];
            } else if (unidad) {
                unidades = [{
                    valor: unidad,
                    texto: unidad.charAt(0).toUpperCase() + unidad.slice(1)
                }];
            }
            //Casos especiales
            if (nombre.includes("chantilly")) {
                unidades = [{
                    valor: "gramo",
                    texto: "Gramo"
                }, {
                    valor: "sprayado",
                    texto: "Sprayado"
                }];
            } else if (nombre.includes("leche condensada")) {
                unidades = [{
                    valor: "gramo",
                    texto: "Gramo"
                }, {
                    valor: "cucharada",
                    texto: "Cucharada"
                }];
            } else if (nombre.includes("hielo")) {
                unidades = [{
                    valor: "bolsa",
                    texto: "Bolsa"
                }];
            } else if (nombre.includes("torta")) {
                unidades = [{
                    valor: "torta",
                    texto: "Torta"
                }];
            } else if (nombre.includes("pajilla")) {
                unidades = [{
                    valor: "unidad",
                    texto: "Unidad"
                }];
            }
            return unidades;
        }

        function llenarSelectUnidad(fila) {

            const tipoInsumo =
                fila.querySelector(".tipo-insumo-select");

            const selectInsumo =
                fila.querySelector(".ingrediente-select");

            const selectUnidad =
                fila.querySelector(".unidad-ingrediente");

            if (!tipoInsumo || !selectInsumo || !selectUnidad) {
                return;
            }

            const tipo = tipoInsumo.value;

            // Limpiar unidades
            selectUnidad.innerHTML = `
        <option value="" selected disabled>
            Seleccione
        </option>
    `;

            // =========================================
            // PRODUCTO ELABORADO
            // =========================================

            if (tipo === "producto") {

                const opcion = document.createElement("option");

                opcion.value = "unidad";
                opcion.textContent = "Unidad";

                selectUnidad.appendChild(opcion);

                selectUnidad.value = "unidad";
                selectUnidad.disabled = true;

                return;
            }

            // =========================================
            // MATERIA PRIMA
            // =========================================

            if (tipo === "materia_prima") {

                const opcionSeleccionada =
                    selectInsumo.options[
                    selectInsumo.selectedIndex
                    ];

                if (
                    !opcionSeleccionada ||
                    !opcionSeleccionada.value ||
                    opcionSeleccionada.value ===
                    "__nueva_materia_prima__"
                ) {
                    selectUnidad.disabled = true;
                    return;
                }

                const unidadMedida =
                    opcionSeleccionada.dataset.unidadMedida || "";

                const nombreInsumo =
                    opcionSeleccionada.textContent || "";

                const unidades =
                    obtenerUnidadesDisponibles(
                        unidadMedida,
                        nombreInsumo
                    );

                unidades.forEach((unidad) => {

                    const opcion =
                        document.createElement("option");

                    opcion.value = unidad.valor;
                    opcion.textContent = unidad.texto;

                    selectUnidad.appendChild(opcion);
                });

                selectUnidad.disabled =
                    unidades.length === 0;
            }
        }

        function actualizarTipoProducto() {
            const tipo = tipoProducto.value;
            if (tipo === "Reventa") {
                seccionReventa.classList.remove("d-none");
                seccionElaborado.classList.add("d-none");
                if (costoCompra) {
                    costoCompra.disabled = false;
                }
            } else if (tipo === "Elaborado") {
                seccionReventa.classList.add("d-none");
                seccionElaborado.classList.remove("d-none");
                if (costoCompra) {
                    costoCompra.disabled = true;
                    costoCompra.value = "";
                }
            } else {
                seccionReventa.classList.add("d-none");
                seccionElaborado.classList.add("d-none");
            }
        }

        // =========================================
        // SINCRONIZAR DATOS DE PRODUCTO ELABORADO
        // =========================================

        if (
            nombreProducto &&
            nombreReceta
        ) {

            nombreProducto.addEventListener(
                "input",
                () => {

                    if (
                        !nombreReceta.dataset.modificado
                    ) {

                        nombreReceta.value =
                            nombreProducto.value;
                    }
                }
            );


            nombreReceta.addEventListener(
                "input",
                () => {

                    nombreReceta.dataset.modificado =
                        "true";
                }
            );
        }


        if (
            stockInicial &&
            cantidadProducidaBase
        ) {

            stockInicial.addEventListener(
                "input",
                () => {

                    if (
                        !cantidadProducidaBase.dataset.modificado
                    ) {

                        cantidadProducidaBase.value =
                            stockInicial.value;
                    }
                }
            );


            cantidadProducidaBase.addEventListener(
                "input",
                () => {

                    cantidadProducidaBase.dataset.modificado =
                        "true";
                }
            );
        }

        async function cargarMateriasPrimas() {

            try {

                const respuesta =
                    await fetch("/api/materiaprima");

                if (!respuesta.ok) {
                    throw new Error(
                        "No se pudieron cargar las materias primas."
                    );
                }

                materiasPrimas =
                    await respuesta.json();

                // Llenar las filas existentes
                const filas =
                    listaIngredientes.querySelectorAll(
                        ".ingrediente-row"
                    );

                filas.forEach((fila) => {

                    const tipoInsumo =
                        fila.querySelector(
                            ".tipo-insumo-select"
                        );

                    const selectInsumo =
                        fila.querySelector(
                            ".ingrediente-select"
                        );

                    if (
                        tipoInsumo &&
                        selectInsumo &&
                        tipoInsumo.value === "materia_prima"
                    ) {
                        llenarSelectMateriaPrima(
                            selectInsumo,
                            materiasPrimas
                        );
                    }
                });

            } catch (error) {

                console.error(
                    "Error al cargar materias primas:",
                    error
                );

                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text:
                        "No se pudieron cargar las materias primas."
                });
            }
        }

        async function cargarProductosElaborados() {

            try {

                const respuesta =
                    await fetch("/api/productos");

                if (!respuesta.ok) {
                    throw new Error(
                        "No se pudieron cargar los productos."
                    );
                }

                const productos =
                    await respuesta.json();

                // Solo productos elaborados
                productosElaborados =
                    productos.filter(
                        (producto) =>
                            producto.tipo === "Elaborado"
                    );

            } catch (error) {

                console.error(
                    "Error al cargar productos elaborados:",
                    error
                );

                Swal.fire({
                    icon: "error",
                    title: "Error",
                    text:
                        "No se pudieron cargar los productos elaborados."
                });
            }
        }

        function crearFilaIngrediente() {

            const nuevaFila =
                document.createElement("div");

            nuevaFila.classList.add(
                "row",
                "g-2",
                "align-items-end",
                "ingrediente-row",
                "mb-2"
            );

            nuevaFila.innerHTML = `

        <!-- Tipo de insumo -->
        <div class="col-md-3">

            <div class="campo">

                <label>
                    Tipo de insumo
                </label>

                <select
                    class="form-select tipo-insumo-select"
                >

                    <option
                        value=""
                        selected
                        disabled
                    >
                        Seleccione
                    </option>

                    <option value="materia_prima">
                        Materia prima
                    </option>

                    <option value="producto">
                        Producto elaborado
                    </option>

                </select>

            </div>

        </div>


        <!-- Insumo -->
        <div class="col-md-4">

            <div class="campo">

                <label>
                    Insumo
                </label>

                <select
                    class="form-select ingrediente-select"
                    disabled
                >

                    <option
                        value=""
                        selected
                        disabled
                    >
                        Seleccione un insumo
                    </option>

                </select>

            </div>

        </div>


        <!-- Cantidad -->
        <div class="col-md-2">

            <div class="campo">

                <label>
                    Cantidad
                </label>

                <input
                    type="number"
                    class="form-control cantidad-ingrediente"
                    min="0"
                    step="0.01"
                    placeholder="Cantidad"
                >

            </div>

        </div>


        <!-- Unidad -->
        <div class="col-md-2">

            <div class="campo">

                <label>
                    Unidad
                </label>

                <select
                    class="form-select unidad-ingrediente"
                    disabled
                >

                    <option
                        value=""
                        selected
                        disabled
                    >
                        Seleccione
                    </option>

                </select>

            </div>

        </div>


        <!-- Eliminar -->
        <div class="col-md-1">

            <button
                type="button"
                class="btn btn-danger w-100 btnEliminarIngrediente"
                title="Eliminar ingrediente"
                style="
                    height: 48px;
                    border-radius: 12px;
                "
            >

                <i class="fa-solid fa-trash"></i>

            </button>

        </div>

    `;

            return nuevaFila;
        }

        // =========================================
        // OBTENER INGREDIENTES DE LA RECETA
        // =========================================

        function obtenerIngredientesReceta() {

            if (!listaIngredientes) {
                return [];
            }

            const filas =
                listaIngredientes.querySelectorAll(
                    ".ingrediente-row"
                );

            const ingredientes = [];

            filas.forEach((fila) => {

                const tipoInsumo =
                    fila.querySelector(
                        ".tipo-insumo-select"
                    );

                const selectInsumo =
                    fila.querySelector(
                        ".ingrediente-select"
                    );

                const inputCantidad =
                    fila.querySelector(
                        ".cantidad-ingrediente"
                    );

                const selectUnidad =
                    fila.querySelector(
                        ".unidad-ingrediente"
                    );

                // Si la fila está completamente vacía
                if (
                    !tipoInsumo?.value &&
                    !selectInsumo?.value &&
                    !inputCantidad?.value &&
                    !selectUnidad?.value
                ) {
                    return;
                }

                const opcionSeleccionada =
                    selectInsumo?.options[
                    selectInsumo.selectedIndex
                    ];

                const tipo = tipoInsumo?.value || "";

                const ingrediente = {

                    tipo: tipo,

                    id_ma:
                        tipo === "materia_prima"
                            ? selectInsumo.value
                            : null,

                    id_producto_insumo:
                        tipo === "producto"
                            ? selectInsumo.value
                            : null,

                    nombre:
                        opcionSeleccionada
                            ? opcionSeleccionada.textContent.trim()
                            : "",

                    cantidad:
                        Number(inputCantidad?.value),

                    unidad:
                        selectUnidad?.value || ""
                };

                ingredientes.push(ingrediente);
            });

            return ingredientes;
        }
        //Eventos del modal
        tipoProducto.addEventListener("change", actualizarTipoProducto);
        btnAgregarProducto.addEventListener("click",
            () => {
                modalAgregarProducto.show();
            });
        if (listaIngredientes) {

            listaIngredientes.addEventListener(
                "change",
                (evento) => {

                    const elemento =
                        evento.target;

                    const fila =
                        elemento.closest(
                            ".ingrediente-row"
                        );

                    if (!fila) {
                        return;
                    }

                    // =====================================
                    // CAMBIO DE TIPO DE INSUMO
                    // =====================================

                    if (
                        elemento.classList.contains(
                            "tipo-insumo-select"
                        )
                    ) {

                        const tipo =
                            elemento.value;

                        const selectInsumo =
                            fila.querySelector(
                                ".ingrediente-select"
                            );

                        const selectUnidad =
                            fila.querySelector(
                                ".unidad-ingrediente"
                            );

                        if (!selectInsumo || !selectUnidad) {
                            return;
                        }

                        // Limpiar unidades
                        selectUnidad.innerHTML = `
                    <option
                        value=""
                        selected
                        disabled
                    >
                        Seleccione
                    </option>
                `;

                        selectUnidad.disabled = true;

                        // -----------------------------
                        // Materia prima
                        // -----------------------------

                        if (tipo === "materia_prima") {

                            llenarSelectMateriaPrima(
                                selectInsumo,
                                materiasPrimas
                            );

                            return;
                        }

                        // -----------------------------
                        // Producto elaborado
                        // -----------------------------

                        if (tipo === "producto") {

                            llenarSelectProductoElaborado(
                                selectInsumo,
                                productosElaborados
                            );

                            return;
                        }

                        // -----------------------------
                        // Ningún tipo
                        // -----------------------------

                        selectInsumo.innerHTML = `
                    <option
                        value=""
                        selected
                        disabled
                    >
                        Seleccione un insumo
                    </option>
                `;

                        selectInsumo.disabled = true;

                        return;
                    }


                    // =====================================
                    // CAMBIO DE INSUMO
                    // =====================================

                    if (
                        elemento.classList.contains(
                            "ingrediente-select"
                        )
                    ) {

                        llenarSelectUnidad(fila);
                    }

                }
            );
        }
        if (listaIngredientes && btnAgregarIngrediente) {
            btnAgregarIngrediente.addEventListener("click",
                () => {
                    const nuevaFila = crearFilaIngrediente();
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
        if (imagenProducto && vistaPreviaImagen) {
            imagenProducto.addEventListener("change",
                () => {
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
                            style="
                                max-height: 135px;
                                object-fit: contain;
                            "
                        >
                    `;
                });
        }

        await cargarMateriasPrimas();
        await cargarProductosElaborados();
        if (formularioProducto && btnGuardarProducto) {
            btnGuardarProducto.addEventListener("click", async () => {
                //Limpiar errores
                formularioProducto.querySelectorAll(".is-invalid").forEach((campo) => {
                    campo.classList.remove("is-invalid");
                });
                let formularioValido = true;
                const nombreProducto = document.getElementById("nombreProducto");
                if (!nombreProducto.value.trim()) {
                    nombreProducto.classList.add("is-invalid");
                    formularioValido = false;
                }
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
                if (!margenGanancia.value || Number(margenGanancia.value) < 0 || Number(margenGanancia.value) > 100) {
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

                if (tipoProducto.value === "Elaborado") {

                    const ingredientes = obtenerIngredientesReceta();

                    if (!nombreReceta.value.trim()) {
                        nombreReceta.classList.add("is-invalid");
                        formularioValido = false;
                    }

                    if (
                        !cantidadProducidaBase.value ||
                        Number(cantidadProducidaBase.value) <= 0
                    ) {
                        cantidadProducidaBase.classList.add("is-invalid");
                        formularioValido = false;
                    }

                    if (ingredientes.length === 0) {
                        formularioValido = false;

                        Swal.fire({
                            icon: "warning",
                            title: "Receta incompleta",
                            text: "Debe agregar al menos un ingrediente a la receta."
                        });

                        return;
                    }

                    ingredientes.forEach((ingrediente) => {

                        // Debe existir un tipo válido
                        if (
                            ingrediente.tipo !== "materia_prima" &&
                            ingrediente.tipo !== "producto"
                        ) {
                            formularioValido = false;
                        }

                        // Materia prima
                        if (
                            ingrediente.tipo === "materia_prima" &&
                            !ingrediente.id_ma
                        ) {
                            formularioValido = false;
                        }

                        // Producto elaborado
                        if (
                            ingrediente.tipo === "producto" &&
                            !ingrediente.id_producto_insumo
                        ) {
                            formularioValido = false;
                        }

                        // Cantidad
                        if (
                            ingrediente.cantidad === undefined ||
                            Number(ingrediente.cantidad) <= 0
                        ) {
                            formularioValido = false;
                        }

                        // Unidad
                        if (!ingrediente.unidad) {
                            formularioValido = false;
                        }

                    });

                    if (!formularioValido) {
                        Swal.fire({
                            icon: "warning",
                            title: "Receta incompleta",
                            text: "Verifique que todos los ingredientes tengan tipo de insumo, cantidad y unidad."
                        });

                        return;
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
                const formData = new FormData();
                formData.append("nombre", nombreProducto.value.trim());
                formData.append("tipo", tipoProducto.value);
                formData.append("precio_venta", Number(precioVenta.value));
                formData.append("margen_gananciab_esperado", Number(margenGanancia.value));
                formData.append("stock_inicial", Number(stockInicial.value));
                if (tipoProducto.value === "Reventa") {
                    formData.append("costo_compra", Number(document.getElementById("costoCompra").value));
                }

                if (tipoProducto.value === "Elaborado") {

                    const ingredientes = obtenerIngredientesReceta();

                    formData.append(
                        "nombre_receta",
                        nombreReceta.value.trim()
                    );

                    formData.append(
                        "cantidad_producida_base",
                        Number(cantidadProducidaBase.value)
                    );

                    const descripcionReceta =
                        document.getElementById("descripcionReceta");

                    if (descripcionReceta) {
                        formData.append(
                            "descripcion_receta",
                            descripcionReceta.value.trim()
                        );
                    }

                    formData.append(
                        "ingredientes",
                        JSON.stringify(ingredientes)
                    );
                }

                if (imagenProducto && imagenProducto.files.length > 0) {
                    formData.append("foto", imagenProducto.files[0]);
                }
                console.log("Enviando producto...");
                try {
                    const respuesta = await fetch("/api/productos", {
                        method: "POST",
                        body: formData
                    });
                    const resultado = await respuesta.json();
                    console.log("Respuesta del servidor:", resultado);
                    if (!respuesta.ok) {
                        throw new Error(resultado.error || "No se pudo crear el producto.");
                    }
                    const tipoTexto = tipoProducto.value === "Reventa" ? "reventa" : "elaborado";
                    await Swal.fire({
                        icon: "success",
                        title: "Producto agregado",
                        text: `El producto de ${tipoTexto} se creó correctamente.`,
                        confirmButtonText: "Aceptar"
                    });
                    modalAgregarProducto.hide();
                    // Actualizar inventario
                    await cargarVista();
                } catch (error) {
                    console.error("Error al crear producto:", error);
                    Swal.fire({
                        icon: "error",
                        title: "Error",
                        text: error.message
                    });
                }
            });
        }
        modalElemento.addEventListener("hidden.bs.modal",
            () => {
                // Restablecer formulario
                if (formularioProducto) {
                    formularioProducto.reset();

                    if (nombreReceta) {
                        delete nombreReceta.dataset.modificado;
                    }

                    if (cantidadProducidaBase) {
                        delete cantidadProducidaBase.dataset.modificado;
                    }
                }
                // Restablecer vista previa
                if (vistaPreviaImagen) {
                    vistaPreviaImagen.innerHTML = `
                        <div class="text-muted">
                            <i class="fa-solid fa-image fa-2x mb-2"></i>
                            <div>Sin imagen</div>
                        </div>
                    `;
                }
                // Ocultar secciones
                seccionReventa.classList.add("d-none");
                seccionElaborado.classList.add("d-none");
                if (listaIngredientes) {
                    const filas = listaIngredientes.querySelectorAll(".ingrediente-row");
                    // Conservar solamente la primera fila
                    filas.forEach(
                        (fila, indice) => {
                            if (indice > 0) {
                                fila.remove();
                            }
                        });
                    // Restablecer primera fila
                    const primeraFila = listaIngredientes.querySelector(".ingrediente-row");
                    if (primeraFila) {
                        const selectMateriaPrima = primeraFila.querySelector(".ingrediente-select");
                        const selectUnidad = primeraFila.querySelector(".unidad-ingrediente");
                        if (selectMateriaPrima) {
                            llenarSelectMateriaPrima(selectMateriaPrima, materiasPrimas);
                        }
                        if (selectUnidad) {
                            selectUnidad.innerHTML = `
                                <option
                                    value=""
                                    selected
                                    disabled
                                >
                                    Seleccione
                                </option>
                            `;
                            selectUnidad.disabled = true;
                        }
                    }
                }
            });
    } catch (error) {
        console.error("Error al cargar el modal de agregar producto:", error);
    }
});
