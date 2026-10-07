let productoEnEdicion = null;
let filaProductoEnEdicion = null;
let fotoNueva = null;
async function cargarModalEditarProducto() {
    try {
        const respuesta = await fetch("editar-producto.html", {
            credentials: "include"
        });

        if (!respuesta.ok) {
            await manejarErrorRespuesta(
                respuesta,
                "No se pudo cargar el modal de editar producto."
            );
            return;
        }
        const html = await respuesta.text();
        const contenedor = document.getElementById("contenedorModalEditarProducto");
        if (!contenedor) {
            throw new Error("No se encontró el contenedor del modal de editar producto.");
        }
        contenedor.innerHTML = html;
        inicializarEventosModalEditar();
    } catch (error) {
        console.error("Error al cargar el modal de editar producto:", error);
    }
}

function inicializarEventosModalEditar() {
    const inputFoto = document.getElementById("editarFotoProducto");
    const btnGuardar = document.getElementById("btnGuardarEdicionProducto");
    // Seleccionar nueva foto
    if (inputFoto) {
        inputFoto.addEventListener("change", function () {
            const archivo = this.files[0];
            if (!archivo) {
                return;
            }
            fotoNueva = archivo;
            const lector = new FileReader();
            lector.onload = function (evento) {
                const imagen = document.getElementById("previewFotoProducto");
                const sinFoto = document.getElementById("sinFotoEditar");
                imagen.src = evento.target.result;
                imagen.style.display = "block";
                sinFoto.style.display = "none";
            };
            lector.readAsDataURL(archivo);
        });
    }
    // Guardar cambios
    if (btnGuardar) {
        btnGuardar.addEventListener("click", guardarCambiosProducto);
    }
    // Limpiar variables al cerrar el modal
    const modalEditarProducto = document.getElementById("modalEditarProducto");
    if (modalEditarProducto) {
        modalEditarProducto.addEventListener("hidden.bs.modal", function () {
            limpiarErroresModalEditar();
            productoEnEdicion = null;
            filaProductoEnEdicion = null;
            fotoNueva = null;
            if (inputFoto) {
                inputFoto.value = "";
            }
        });
    }
}

function abrirModalEditarProducto(producto, fila = null) {
    const modalEl = document.getElementById("modalEditarProducto");
    if (!modalEl) {
        console.error("El modal de editar producto todavía no está cargado en el DOM.");
        Swal.fire({
            icon: "error",
            title: "No se pudo abrir el editor",
            text: "El formulario de edición no está disponible."
        });
        return;
    }
    productoEnEdicion = producto;
    filaProductoEnEdicion = fila;
    fotoNueva = null;
    limpiarErroresModalEditar();
    document.getElementById("editarNombreProducto").value = producto.nombre ?? "";
    document.getElementById("editarPrecioVenta").value = producto.precio_venta ?? "";
    document.getElementById("editarStockMinimo").value =
        producto.stock_minimo_p ?? "";
    const inputCosto = document.getElementById("editarCostoProducto");
    if (producto.tipo === "Reventa") {
        inputCosto.disabled = false;
        inputCosto.value = producto.costo ?? "";
    } else {
        inputCosto.disabled = true;
        inputCosto.value = producto.costo ?? "";
    }
    mostrarFotoEditar(producto.foto_producto);
    document.getElementById("editarFotoProducto").value = "";
    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    modal.show();
}

function mostrarFotoEditar(url) {
    const imagen = document.getElementById("previewFotoProducto");
    const sinFoto = document.getElementById("sinFotoEditar");
    if (url) {
        imagen.src = url;
        imagen.style.display = "block";
        sinFoto.style.display = "none";
    } else {
        imagen.src = "";
        imagen.style.display = "none";
        sinFoto.style.display = "block";
    }
}

function limpiarErroresModalEditar() {
    document.querySelectorAll("#modalEditarProducto .error-msg").forEach(el => {
        el.textContent = "";
    });
    document.querySelectorAll("#modalEditarProducto .is-invalid").forEach(el => {
        el.classList.remove("is-invalid");
    });
    const errorGeneral = document.getElementById("errorGeneralEditar");
    if (errorGeneral) {
        errorGeneral.textContent = "";
    }
}

function mostrarErrorCampoEditar(idInput, idError, mensaje) {
    const modal = document.getElementById("modalEditarProducto");

    if (!modal) {
        return;
    }

    const input = modal.querySelector(`#${idInput}`);
    const errorEl = modal.querySelector(`#${idError}`);

    if (input) {
        input.classList.add("is-invalid");
    }

    if (errorEl) {
        errorEl.textContent = mensaje;
    }
}

async function guardarCambiosProducto() {
    limpiarErroresModalEditar();
    if (!productoEnEdicion) {
        return;
    }
    let esValido = true;
    const nombreInput = document.getElementById("editarNombreProducto");
    const nombre = nombreInput.value.trim();
    if (!nombre) {
        mostrarErrorCampoEditar("editarNombreProducto", "errorNombreProducto", "Ingrese el nombre del producto.");
        esValido = false;
    }
    const precioInput = document.getElementById("editarPrecioVenta");
    const precioTexto = precioInput.value.trim();
    const precio = Number(precioTexto);
    if (precioTexto === "" || Number.isNaN(precio) || precio < 0) {
        mostrarErrorCampoEditar("editarPrecioVenta", "errorPrecioVenta", "Ingrese un precio válido mayor o igual a 0.");
        esValido = false;
    }
    let costo = null;
    if (productoEnEdicion.tipo === "Reventa") {
        const costoInput = document.getElementById("editarCostoProducto");
        const costoTexto = costoInput.value.trim();
        costo = Number(costoTexto);
        if (costoTexto === "" || Number.isNaN(costo) || costo < 0) {
            mostrarErrorCampoEditar("editarCostoProducto", "errorCostoProducto", "Ingrese un costo válido mayor o igual a 0.");
            esValido = false;
        }
    }

    const stockMinimoInput =
        document.getElementById("editarStockMinimo");

    const stockMinimoTexto =
        stockMinimoInput.value.trim();

    const stockMinimo =
        Number(stockMinimoTexto);

    if (
        stockMinimoTexto === "" ||
        Number.isNaN(stockMinimo) ||
        !Number.isInteger(stockMinimo) ||
        stockMinimo < 0
    ) {
        mostrarErrorCampoEditar(
            "editarStockMinimo",
            "errorStockMinimo",
            "Ingrese un stock mínimo entero mayor o igual a 0."
        );

        esValido = false;
    }

    if (!esValido) {
        return;
    }
    const cambios = {
        nombre: nombre,
        precio_venta: precio,
        stock_minimo_p: stockMinimo
    };
    if (productoEnEdicion.tipo === "Reventa") {
        cambios.costo = costo;
    }
    try {
        const respuesta = await fetch(
            `/api/productos/${productoEnEdicion.id_producto}`,
            {
                method: "PATCH",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(cambios)
            }
        );

        if (!respuesta.ok) {
            await manejarErrorRespuesta(
                respuesta,
                "No se pudieron actualizar los datos del producto."
            );
            return;
        }

        const data = await respuesta.json();
        // Producto actualizado por el primer PATCH
        let productoActualizado = data.producto;
        if (fotoNueva) {
            const datosFoto = new FormData();
            datosFoto.append("foto", fotoNueva);
            const respuestaFoto = await fetch(
                `/api/productos/${productoEnEdicion.id_producto}/foto`,
                {
                    method: "PATCH",
                    credentials: "include",
                    body: datosFoto
                }
            );

            if (!respuestaFoto.ok) {
                await manejarErrorRespuesta(
                    respuestaFoto,
                    "Los datos se actualizaron, pero no se pudo actualizar la foto."
                );
                return;
            }

            const dataFoto = await respuestaFoto.json();
            productoActualizado = {
                ...productoActualizado,
                ...dataFoto.producto
            };
        }
        if (filaProductoEnEdicion) {
            filaProductoEnEdicion.update(productoActualizado);
        }
        productoEnEdicion = {
            ...productoEnEdicion,
            ...productoActualizado
        };
        await Swal.fire({
            icon: "success",
            title: "Producto actualizado",
            text: "Los cambios se guardaron correctamente.",
            confirmButtonText: "Aceptar"
        });
        const modalElement = document.getElementById("modalEditarProducto");
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    } catch (error) {
        console.error("Error al guardar cambios del producto:", error);
        mostrarErrorGeneralEditar(error.message || "No se pudieron guardar los cambios.");
    }
}
document.addEventListener("DOMContentLoaded", cargarModalEditarProducto);
