let recetaEnEdicion = null;
let materiasPrimasEditar = [];
let productosElaboradosEditar = [];
let modalEditarReceta = null;
/* =========================================================
   CARGAR MODAL
   ========================================================= */
async function cargarModalEditarReceta() {
    try {
        // Evitar cargar el HTML más de una vez
        if (document.getElementById("modalEditarReceta")) {
            return;
        }
        const respuesta = await fetch("editar-receta.html");
        if (!respuesta.ok) {
            throw new Error("No se pudo cargar editar-receta.html.");
        }
        const html = await respuesta.text();
        const contenedor = document.createElement("div");
        contenedor.innerHTML = html;
        document.body.appendChild(contenedor.firstElementChild);
        inicializarModalEditarReceta();
    } catch (error) {
        console.error("Error al cargar modal de editar receta:", error);
        throw error;
    }
}
/* =========================================================
   INICIALIZAR MODAL
   ========================================================= */
function inicializarModalEditarReceta() {
    const formulario = document.getElementById("formEditarReceta");
    const btnAgregar = document.getElementById("btnAgregarIngredienteEditar");
    if (!formulario || !btnAgregar) {
        console.error("No se encontraron los elementos del modal de edición.");
        return;
    }
    formulario.addEventListener("submit", guardarCambiosReceta);
    btnAgregar.addEventListener("click",
        () => {
            agregarFilaIngredienteEditar();
        });
    const elementoModal = document.getElementById("modalEditarReceta");
    if (elementoModal) {
        elementoModal.addEventListener("hidden.bs.modal", limpiarModalEditarReceta);
    }
}
/* =========================================================
   ABRIR MODAL
   ========================================================= */
async function abrirModalEditarReceta(idReceta) {
    try {
        await cargarModalEditarReceta();
        const respuesta = await fetch(`/api/detalle_receta/${idReceta}`);
        if (!respuesta.ok) {
            throw new Error("No se pudo obtener la información de la receta.");
        }
        const detalle = await respuesta.json();
        if (!Array.isArray(detalle) || detalle.length === 0) {
            throw new Error("La receta no contiene información.");
        }
        /*
         * Guardamos la receta completa en memoria.
         *
         * No usamos un input hidden para el ID.
         */
        recetaEnEdicion = {
            id_receta: Number(idReceta),
            datos: detalle
        };
        /*
         * Cargar las listas necesarias.
         */
        await cargarDatosParaEdicion();
        /*
         * Llenar formulario.
         */
        llenarFormularioReceta(detalle);
        const elementoModal = document.getElementById("modalEditarReceta");
        modalEditarReceta = bootstrap.Modal.getOrCreateInstance(elementoModal);
        modalEditarReceta.show();
    } catch (error) {
        console.error("Error al abrir edición de receta:", error);
        Swal.fire({
            icon: "error",
            title: "No fue posible cargar la receta",
            text: error.message
        });
    }
}
/* =========================================================
   CARGAR DATOS PARA EDICIÓN
   ========================================================= */
async function cargarDatosParaEdicion() {
    const [
        respuestaMP,
        respuestaProductos
    ] = await Promise.all([
        fetch("/api/materiaprima"),
        fetch("/api/productos")
    ]);
    if (!respuestaMP.ok) {
        throw new Error("No se pudieron cargar las materias primas.");
    }
    if (!respuestaProductos.ok) {
        throw new Error("No se pudieron cargar los productos.");
    }
    const materiasPrimas = await respuestaMP.json();
    const productos = await respuestaProductos.json();
    materiasPrimasEditar = Array.isArray(materiasPrimas) ? materiasPrimas : [];
    productosElaboradosEditar = Array.isArray(productos) ? productos.filter(producto => producto.tipo === "Elaborado") : [];
}
/* =========================================================
   LLENAR FORMULARIO
   ========================================================= */
function llenarFormularioReceta(detalle) {
    const receta = detalle[0];
    document.getElementById("nombreRecetaEditar").value = receta.nombre_receta || "";
    document.getElementById("cantidadBaseEditar").value = receta.cantidad_producida_base || "";
    document.getElementById("descripcionRecetaEditar").value = receta.descripcion || "";
    const contenedor = document.getElementById("contenedorIngredientesEditar");
    contenedor.innerHTML = "";
    detalle.forEach(ingrediente => {
        agregarFilaIngredienteEditar(ingrediente);
    });
    limpiarErroresEditar();
}
/* =========================================================
   CREAR FILA DE INGREDIENTE
   ========================================================= */
function agregarFilaIngredienteEditar(ingredienteExistente = null) {
    const contenedor = document.getElementById("contenedorIngredientesEditar");
    const fila = document.createElement("div");
    fila.className = "row g-2 align-items-end ingrediente-row mb-2";
    fila.innerHTML = `

        <!-- Tipo de insumo -->

        <div class="col-md-3">

            <div class="campo">

                <label>
                    Tipo de insumo
                </label>

                <select class="tipo-insumo-editar">

                    <option value="">
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
                    class="insumo-editar"
                    disabled>

                    <option value="">
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
                    type="text"
                    class="cantidad-insumo-editar"
                    inputmode="text"
                    placeholder="Cantidad">

            </div>

        </div>


        <!-- Unidad -->

        <div class="col-md-2">

            <div class="campo">

                <label>
                    Unidad
                </label>

                <select
                    class="unidad-insumo-editar"
                    disabled>

                    <option value="">
                        Seleccione
                    </option>

                </select>

            </div>

        </div>


        <!-- Eliminar -->

        <div class="col-md-1">

            <button
                type="button"
                class="btn btn-outline-danger btnEliminarIngredienteEditar w-100"
                title="Eliminar ingrediente"
                aria-label="Eliminar ingrediente">

                <i class="bi bi-trash"></i>

            </button>

        </div>


        <!-- Error -->

        <div class="col-12">

            <div class="error-msg error-fila-ingrediente"></div>

        </div>

    `;
    contenedor.appendChild(fila);
    const selectTipo = fila.querySelector(".tipo-insumo-editar");
    const selectInsumo = fila.querySelector(".insumo-editar");
    const selectUnidad = fila.querySelector(".unidad-insumo-editar");
    const btnEliminar = fila.querySelector(".btnEliminarIngredienteEditar");
    selectTipo.addEventListener("change",
        () => {
            cargarInsumosFilaEditar(fila, selectTipo.value);
        });
    selectInsumo.addEventListener("change",
        () => {
            cargarUnidadesFilaEditar(fila);
        });
    btnEliminar.addEventListener("click",
        () => {
            fila.remove();
        });
    if (ingredienteExistente) {
        const tipo = obtenerTipoIngrediente(ingredienteExistente);
        selectTipo.value = tipo;
        cargarInsumosFilaEditar(fila, tipo, ingredienteExistente);
    }
}
/* =========================================================
   OBTENER TIPO
   ========================================================= */
function obtenerTipoIngrediente(ingrediente) {
    if (ingrediente.id_ma !== null && ingrediente.id_ma !== undefined) {
        return "materia_prima";
    }
    if (ingrediente.id_producto_insumo !== null && ingrediente.id_producto_insumo !== undefined) {
        return "producto";
    }
    return "";
}
/* =========================================================
   CARGAR INSUMOS
   ========================================================= */
function cargarInsumosFilaEditar(fila, tipo, ingredienteExistente = null) {
    const selectInsumo = fila.querySelector(".insumo-editar");
    const selectUnidad = fila.querySelector(".unidad-insumo-editar");
    selectInsumo.innerHTML = `
        <option value="">
            Seleccione un insumo
        </option>
    `;
    selectUnidad.innerHTML = `
        <option value="">
            Seleccione
        </option>
    `;
    selectInsumo.disabled = true;
    selectUnidad.disabled = true;
    /* -----------------------------------------------------
       Materia prima
       ----------------------------------------------------- */
    if (tipo === "materia_prima") {
        materiasPrimasEditar.forEach(materia => {
            const opcion = document.createElement("option");
            opcion.value = materia.id_ma;
            opcion.textContent = materia.nombre;
            selectInsumo.appendChild(opcion);
        });
        selectInsumo.disabled = false;
    }
    /* -----------------------------------------------------
       Producto elaborado
       ----------------------------------------------------- */
    if (tipo === "producto") {
        productosElaboradosEditar.forEach(producto => {
            /*
             * No permitir que el producto utilice
             * su propia receta como ingrediente.
             */
            if (recetaEnEdicion && Number(producto.id_producto) === Number(recetaEnEdicion.datos[0].id_producto)) {
                return;
            }
            const opcion = document.createElement("option");
            opcion.value = producto.id_producto;
            opcion.textContent = producto.nombre;
            selectInsumo.appendChild(opcion);
        });
        selectInsumo.disabled = false;
    }
    /* -----------------------------------------------------
       Restaurar ingrediente existente
       ----------------------------------------------------- */
    if (ingredienteExistente) {
        if (tipo === "materia_prima" && ingredienteExistente.id_ma !== null) {
            selectInsumo.value = ingredienteExistente.id_ma;
        }
        if (tipo === "producto" && ingredienteExistente.id_producto_insumo !== null) {
            selectInsumo.value = ingredienteExistente.id_producto_insumo;
        }
        cargarUnidadesFilaEditar(fila, ingredienteExistente);
    }
}
/* =========================================================
   OBTENER UNIDADES DISPONIBLES
   ========================================================= */
function obtenerUnidadesDisponiblesEditar(materiaPrima) {
    const unidades = [];
    const agregarUnidad = (valor, texto) => {
        if (!valor) {
            return;
        }
        const valorNormalizado = String(valor).trim().toLowerCase();
        const yaExiste = unidades.some(unidad => unidad.valor === valorNormalizado);
        if (yaExiste) {
            return;
        }
        unidades.push({
            valor: valorNormalizado,
            texto: texto || capitalizarUnidadEditar(valor)
        });
    };
    /*
     * Unidad base de inventario.
     */
    agregarUnidad(materiaPrima.unidad_medida, materiaPrima.unidad_medida);
    /*
     * Unidad de existencia/compra.
     */
    agregarUnidad(materiaPrima.unidad_existencia, materiaPrima.unidad_existencia);
    /*
     * Unidades configuradas en conversion_unidad.
     */
    if (Array.isArray(materiaPrima.conversiones)) {
        materiaPrima.conversiones.forEach(conversion => {
            agregarUnidad(conversion.unidad_ingresada, conversion.unidad_ingresada);
        });
    }
    return unidades;
}
/* =========================================================
   CAPITALIZAR UNIDAD
   ========================================================= */
function capitalizarUnidadEditar(valor) {
    const texto = String(valor).trim();
    if (!texto) {
        return "";
    }
    return (texto.charAt(0).toUpperCase() + texto.slice(1));
}
/* =========================================================
   CARGAR UNIDADES DE UNA FILA
   ========================================================= */
function cargarUnidadesFilaEditar(fila, ingredienteExistente = null) {
    const selectTipo = fila.querySelector(".tipo-insumo-editar");
    const selectInsumo = fila.querySelector(".insumo-editar");
    const selectUnidad = fila.querySelector(".unidad-insumo-editar");
    const inputCantidad = fila.querySelector(".cantidad-insumo-editar");
    selectUnidad.innerHTML = `
        <option value="">
            Seleccione
        </option>
    `;
    selectUnidad.disabled = true;
    const tipo = selectTipo.value;
    const idInsumo = Number(selectInsumo.value);
    if (!idInsumo) {
        return;
    }
    /* -----------------------------------------------------
       Producto elaborado
       ----------------------------------------------------- */
    if (tipo === "producto") {
        const opcion = document.createElement("option");
        opcion.value = "unidad";
        opcion.textContent = "Unidad";
        selectUnidad.appendChild(opcion);
        selectUnidad.value = "unidad";
        selectUnidad.disabled = false;
        if (ingredienteExistente) {
            inputCantidad.value = ingredienteExistente.cantidad_ingresada || "";
        }
        return;
    }
    /* -----------------------------------------------------
       Materia prima
       ----------------------------------------------------- */
    if (tipo !== "materia_prima") {
        return;
    }
    const materiaPrima = materiasPrimasEditar.find(materia => Number(materia.id_ma) === idInsumo);
    if (!materiaPrima) {
        return;
    }
    const unidades = obtenerUnidadesDisponiblesEditar(materiaPrima);
    unidades.forEach(unidad => {
        const opcion = document.createElement("option");
        opcion.value = unidad.valor;
        opcion.textContent = unidad.texto;
        selectUnidad.appendChild(opcion);
    });
    selectUnidad.disabled = false;
    /*
     * Restaurar valores originales.
     */
    if (ingredienteExistente) {
        inputCantidad.value = ingredienteExistente.cantidad_ingresada || "";
        const unidadOriginal = ingredienteExistente.unidad_ingresada;
        if (unidadOriginal) {
            /*
             * Buscar ignorando mayúsculas/minúsculas.
             */
            const opcion = [...selectUnidad.options].find(option => option.value.toLowerCase() === String(unidadOriginal).trim().toLowerCase());
            if (opcion) {
                selectUnidad.value = opcion.value;
            } else {
                /*
                 * Si por alguna razón la unidad
                 * histórica ya no aparece en las
                 * conversiones actuales, la agregamos
                 * para no perder información al editar.
                 */
                const opcionHistorica = document.createElement("option");
                opcionHistorica.value = String(unidadOriginal).trim().toLowerCase();
                opcionHistorica.textContent = unidadOriginal;
                selectUnidad.appendChild(opcionHistorica);
                selectUnidad.value = opcionHistorica.value;
            }
        }
    }
}
/* =========================================================
   OBTENER INGREDIENTES DEL FORMULARIO
   ========================================================= */
function obtenerIngredientesEditar() {
    const filas = document.querySelectorAll("#contenedorIngredientesEditar .ingrediente-editar");
    const ingredientes = [];
    filas.forEach(fila => {
        const tipo = fila.querySelector(".tipo-insumo-editar").value;
        const selectInsumo = fila.querySelector(".insumo-editar");
        const cantidad = fila.querySelector(".cantidad-insumo-editar").value.trim();
        const unidad = fila.querySelector(".unidad-insumo-editar").value;
        if (!tipo && !selectInsumo.value && !cantidad && !unidad) {
            return;
        }
        ingredientes.push({
            tipo,
            id_ma: tipo === "materia_prima" ? Number(selectInsumo.value) : null,
            id_producto_insumo: tipo === "producto" ? Number(selectInsumo.value) : null,
            cantidad,
            unidad
        });
    });
    return ingredientes;
}
/* =========================================================
   VALIDAR FORMULARIO
   ========================================================= */
function validarFormularioEditar() {
    limpiarErroresEditar();
    let valido = true;
    const nombre = document.getElementById("nombreRecetaEditar").value.trim();
    const cantidadBase = document.getElementById("cantidadBaseEditar").value.trim();
    /* -----------------------------------------------------
       Nombre
       ----------------------------------------------------- */
    if (!nombre) {
        mostrarErrorEditar("errorNombreRecetaEditar", "El nombre de la receta es obligatorio.");
        valido = false;
    }
    if (nombre.length > 100) {
        mostrarErrorEditar("errorNombreRecetaEditar", "El nombre no puede superar los 100 caracteres.");
        valido = false;
    }
    /* -----------------------------------------------------
       Cantidad base
       ----------------------------------------------------- */
    const numeroBase = Number(cantidadBase);
    if (!cantidadBase || !Number.isInteger(numeroBase) || numeroBase <= 0) {
        mostrarErrorEditar("errorCantidadBaseEditar", "Debe ingresar un número entero mayor que cero.");
        valido = false;
    }
    /* -----------------------------------------------------
       Ingredientes
       ----------------------------------------------------- */
    const filas = document.querySelectorAll("#contenedorIngredientesEditar .ingrediente-editar");
    if (filas.length === 0) {
        mostrarErrorEditar("errorIngredientesEditar", "Debe existir al menos un ingrediente.");
        valido = false;
    }
    filas.forEach(fila => {
        const tipo = fila.querySelector(".tipo-insumo-editar").value;
        const insumo = fila.querySelector(".insumo-editar").value;
        const cantidad = fila.querySelector(".cantidad-insumo-editar").value.trim();
        const unidad = fila.querySelector(".unidad-insumo-editar").value;
        const errorFila = fila.querySelector(".error-fila-ingrediente");
        const errores = [];
        if (!tipo) {
            errores.push("Seleccione el tipo de insumo.");
        }
        if (!insumo) {
            errores.push("Seleccione el insumo.");
        }
        if (!cantidad) {
            errores.push("Ingrese una cantidad.");
        }
        if (!unidad) {
            errores.push("Seleccione una unidad.");
        }
        if (errores.length > 0) {
            errorFila.textContent = errores.join(" ");
            valido = false;
        }
    });
    if (filas.length > 0 && [...filas].every(fila => !fila.querySelector(".tipo-insumo-editar").value && !fila.querySelector(".insumo-editar").value && !fila.querySelector(".cantidad-insumo-editar").value && !fila.querySelector(".unidad-insumo-editar").value)) {
        mostrarErrorEditar("errorIngredientesEditar", "Debe agregar al menos un ingrediente.");
        valido = false;
    }
    return valido;
}
/* =========================================================
   GUARDAR CAMBIOS
   ========================================================= */
async function guardarCambiosReceta(evento) {
    evento.preventDefault();
    if (!validarFormularioEditar()) {
        return;
    }
    if (!recetaEnEdicion) {
        Swal.fire({
            icon: "error",
            title: "Error",
            text: "No hay una receta seleccionada para editar."
        });
        return;
    }
    const boton = document.getElementById("btnGuardarCambiosReceta");
    const nombre = document.getElementById("nombreRecetaEditar").value.trim();
    const cantidadBase = Number(document.getElementById("cantidadBaseEditar").value);
    const descripcion = document.getElementById("descripcionRecetaEditar").value.trim();
    const ingredientes = obtenerIngredientesEditar();
    try {
        boton.disabled = true;
        boton.innerHTML = `
            <span
                class="spinner-border spinner-border-sm me-1"
                role="status">
            </span>
            Guardando...
        `;
        const respuesta = await fetch(`/api/recetas/${recetaEnEdicion.id_receta}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                nombre_receta: nombre,
                cantidad_producida_base: cantidadBase,
                descripcion: descripcion || null,
                ingredientes
            })
        });
        const resultado = await respuesta.json();
        if (!respuesta.ok) {
            throw new Error(resultado.mensaje || "No fue posible actualizar la receta.");
        }
        /*
         * Guardamos el ID antes de limpiar el estado.
         */
        const idRecetaActualizada = recetaEnEdicion.id_receta;
        /*
         * Cerrar editor.
         */
        if (modalEditarReceta) {
            modalEditarReceta.hide();
        }
        /*
         * Actualizar la lista de tarjetas.
         */
        await cargarRecetas();
        /*
         * Actualizar el modal de detalle.
         *
         * Si el modal de detalle sigue abierto,
         * esta función lo vuelve a cargar.
         */
        await cargarDetalleReceta(idRecetaActualizada);
        await Swal.fire({
            icon: "success",
            title: "Receta actualizada",
            text: "Los cambios se guardaron correctamente.",
            timer: 1800,
            showConfirmButton: false
        });
    } catch (error) {
        console.error("Error al guardar receta:", error);
        Swal.fire({
            icon: "error",
            title: "No se pudo guardar",
            text: error.message
        });
    } finally {
        boton.disabled = false;
        boton.innerHTML = `
            <i class="bi bi-check-circle me-1"></i>
            Guardar cambios
        `;
    }
}
/* =========================================================
   LIMPIAR MODAL
   ========================================================= */
function limpiarModalEditarReceta() {
    const formulario = document.getElementById("formEditarReceta");
    if (formulario) {
        formulario.reset();
    }
    const contenedor = document.getElementById("contenedorIngredientesEditar");
    if (contenedor) {
        contenedor.innerHTML = "";
    }
    limpiarErroresEditar();
    recetaEnEdicion = null;
}
/* =========================================================
   ERRORES
   ========================================================= */
function mostrarErrorEditar(id, mensaje) {
    const elemento = document.getElementById(id);
    if (elemento) {
        elemento.textContent = mensaje;
    }
}

function limpiarErroresEditar() {
    document.querySelectorAll("#modalEditarReceta .error-msg").forEach(error => {
        error.textContent = "";
    });
}
