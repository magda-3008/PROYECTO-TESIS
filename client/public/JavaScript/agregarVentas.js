const API_PRODUCTOS = "/api/productos";

let productos = [];
let carrito = [];
let categoriaActual = "Todos";

const formatoMoneda = (cantidad) =>
    `C$ ${Number(cantidad || 0).toFixed(2)}`;

const escaparHTML = (texto) =>
    String(texto ?? "").replace(/[&<>"']/g, (caracter) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[caracter]);

function obtenerStock(producto) {
    const stock = Number(producto.stock_actual);
    return producto.stock_actual !== null &&
        producto.stock_actual !== undefined &&
        producto.stock_actual !== "" &&
        Number.isFinite(stock)
        ? stock
        : null;
}

async function cargarProductos() {
    const contenedor = document.getElementById("productosGrid");

    if (!contenedor) return;

    contenedor.innerHTML = "<p>Cargando productos...</p>";

    try {
        const respuesta = await fetch(API_PRODUCTOS);

        if (!respuesta.ok) {
            throw new Error(`Error HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();

        productos = Array.isArray(datos)
            ? datos
            : Array.isArray(datos.productos)
                ? datos.productos
                : Array.isArray(datos.data)
                    ? datos.data
                    : [];

        productos = productos.filter(producto =>
            producto.estado == null ||
            ["activo", "activa", "true", "1"].includes(
                String(producto.estado).toLowerCase()
            )
        );

        mostrarProductos();
    } catch (error) {
        console.error("Error al cargar productos:", error);

        contenedor.innerHTML = `
            <p class="mensaje-error">
                No se pudieron cargar los productos.
                Comprueba que el servidor esté funcionando
                en el puerto 3000.
            </p>
        `;
    }
}

function perteneceCategoria(producto, categoria) {
    if (categoria === "Todos") return true;

    const texto = `${producto.nombre || ""} ${producto.tipo || ""}`
        .toLowerCase();

    const palabras = {
        Dulces: [
            "dulce", "caramelo", "chocolate", "confite",
            "gomita", "galleta", "chupeta", "bombón"
        ],
        Bebidas: [
            "bebida", "refresco", "agua", "jugo",
            "café", "té", "batido", "limonada"
        ],
        Postres: [
            "postre", "pastel", "torta", "budín",
            "flan", "gelatina", "cupcake", "brownie"
        ]
    };

    return (palabras[categoria] || []).some(palabra =>
        texto.includes(palabra)
    );
}

function mostrarProductos() {
    const contenedor = document.getElementById("productosGrid");
    const buscador = document.getElementById("buscador");

    if (!contenedor) return;

    const busqueda = (buscador?.value || "").trim().toLowerCase();

    const filtrados = productos.filter(producto => {
        const coincideNombre = String(producto.nombre || "")
            .toLowerCase()
            .includes(busqueda);

        return coincideNombre &&
            perteneceCategoria(producto, categoriaActual);
    });

    if (filtrados.length === 0) {
        contenedor.innerHTML =
            "<p>No se encontraron productos para este filtro.</p>";
        return;
    }

    contenedor.innerHTML = filtrados.map(producto => {
        const precio = Number(producto.precio_venta) || 0;
        const stock = obtenerStock(producto);
        const agotado = stock !== null && stock <= 0;
        const imagen = String(producto.foto_producto || "").trim();

        return `
            <article class="producto-card">
                <div class="producto-imagen">
                    ${imagen
                ? `<img
                                src="${escaparHTML(imagen)}"
                                alt="${escaparHTML(producto.nombre)}"
                                loading="lazy"
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                            >`
                : ""
            }
                    <div class="producto-sin-foto"
                         style="display:${imagen ? "none" : "flex"}">
                        Sin fotografía
                    </div>
                </div>

                <div class="producto-info">
                    <h3>${escaparHTML(producto.nombre)}</h3>

                    <p class="producto-precio">
                        ${formatoMoneda(precio)}
                    </p>

                    ${stock !== null
                ? `<small>Stock: ${stock}</small>`
                : ""
            }

                    <button
                        type="button"
                        class="btn-agregar-producto"
                        data-id="${escaparHTML(producto.id_producto)}"
                        ${agotado ? "disabled" : ""}
                    >
                        ${agotado ? "Agotado" : "Agregar al carrito"}
                    </button>
                </div>
            </article>
        `;
    }).join("");

    contenedor.querySelectorAll(".btn-agregar-producto")
        .forEach(boton => {
            boton.addEventListener("click", () => {
                agregarAlCarrito(boton.dataset.id);
            });
        });
}

function agregarAlCarrito(id) {
    const producto = productos.find(p =>
        String(p.id_producto) === String(id)
    );

    if (!producto) return;

    const stock = obtenerStock(producto);
    const existente = carrito.find(item =>
        String(item.id_producto) === String(id)
    );

    if (stock !== null &&
        (existente?.cantidad || 0) >= stock) {
        alert("No hay suficiente existencia para agregar otra unidad.");
        return;
    }

    if (existente) {
        existente.cantidad++;
    } else {
        carrito.push({
            ...producto,
            cantidad: 1
        });
    }

    mostrarCarrito();
}

function cambiarCantidad(id, cambio) {
    const item = carrito.find(producto =>
        String(producto.id_producto) === String(id)
    );

    if (!item) return;

    const nuevaCantidad = item.cantidad + cambio;
    const stock = obtenerStock(item);

    if (nuevaCantidad <= 0) {
        carrito = carrito.filter(producto =>
            String(producto.id_producto) !== String(id)
        );
    } else {
        if (stock !== null && nuevaCantidad > stock) {
            alert("La cantidad supera el stock disponible.");
            return;
        }

        item.cantidad = nuevaCantidad;
    }

    mostrarCarrito();
}

function calcularTotales() {
    const subtotal = carrito.reduce((suma, item) =>
        suma + Number(item.precio_venta || 0) * item.cantidad, 0
    );

    const campoDescuento = document.getElementById("descuento");
    let descuento = Number(campoDescuento?.value) || 0;

    descuento = Math.max(0, Math.min(descuento, subtotal));

    if (campoDescuento) {
        campoDescuento.max = subtotal.toFixed(2);
        campoDescuento.value = descuento;
    }

    const total = Math.max(0, subtotal - descuento);

    document.getElementById("subtotal").textContent =
        formatoMoneda(subtotal);

    document.getElementById("descuentoMonto").textContent =
        formatoMoneda(descuento);

    document.getElementById("total").textContent =
        formatoMoneda(total);

    return { subtotal, descuento, total };
}

function mostrarCarrito() {
    const contenedor = document.getElementById("carritoItems");

    if (!contenedor) return;

    if (carrito.length === 0) {
        contenedor.innerHTML = `
            <div class="carrito-vacio">
                <p>El carrito está vacío</p>
                <small>Agrega productos para comenzar una venta</small>
            </div>
        `;
    } else {
        contenedor.innerHTML = carrito.map(item => {
            const precio = Number(item.precio_venta) || 0;
            const subtotalItem = precio * item.cantidad;

            return `
                <div class="carrito-item">
                    <div class="carrito-producto">
                        <strong>${escaparHTML(item.nombre)}</strong>
                    </div>

                    <span>${formatoMoneda(precio)}</span>

                    <div class="carrito-cantidad">
                        <button
                            type="button"
                            data-accion="menos"
                            data-id="${escaparHTML(item.id_producto)}"
                            aria-label="Disminuir cantidad"
                        >−</button>

                        <span>${item.cantidad}</span>

                        <button
                            type="button"
                            data-accion="mas"
                            data-id="${escaparHTML(item.id_producto)}"
                            aria-label="Aumentar cantidad"
                        >+</button>
                    </div>

                    <strong>${formatoMoneda(subtotalItem)}</strong>

                    <button
                        type="button"
                        data-accion="eliminar"
                        data-id="${escaparHTML(item.id_producto)}"
                        aria-label="Eliminar producto"
                    >✕</button>
                </div>
            `;
        }).join("");

        contenedor.querySelectorAll("button[data-accion]")
            .forEach(boton => {
                boton.addEventListener("click", () => {
                    const id = boton.dataset.id;
                    const accion = boton.dataset.accion;

                    if (accion === "mas") cambiarCantidad(id, 1);
                    if (accion === "menos") cambiarCantidad(id, -1);

                    if (accion === "eliminar") {
                        carrito = carrito.filter(item =>
                            String(item.id_producto) !== String(id)
                        );

                        mostrarCarrito();
                    }
                });
            });
    }

    calcularTotales();
}

function configurarEventos() {
    document.getElementById("buscador")
        ?.addEventListener("input", mostrarProductos);

    document.querySelectorAll(".categoria")
        .forEach(boton => {
            boton.addEventListener("click", () => {
                categoriaActual = boton.dataset.category || "Todos";

                document.querySelectorAll(".categoria")
                    .forEach(categoria => {
                        categoria.classList.toggle(
                            "active",
                            categoria === boton
                        );
                    });

                mostrarProductos();
            });
        });

    document.getElementById("btnFiltrar")
        ?.addEventListener("click", mostrarProductos);

    document.getElementById("descuento")
        ?.addEventListener("input", calcularTotales);

    document.getElementById("btnVaciar")
        ?.addEventListener("click", () => {
            if (carrito.length === 0) return;

            if (confirm("¿Deseas vaciar el carrito?")) {
                carrito = [];
                mostrarCarrito();
            }
        });

    document.getElementById("btnCancelar")
        ?.addEventListener("click", () => {
            if (carrito.length === 0 ||
                confirm("¿Deseas cancelar esta venta y vaciar el carrito?")) {
                carrito = [];
                const descuento = document.getElementById("descuento");

                if (descuento) descuento.value = 0;

                mostrarCarrito();
            }
        });

    document.getElementById("btnGuardar")
        ?.addEventListener("click", avisarGuardadoPendiente);

    document.getElementById("btnFinalizar")
        ?.addEventListener("click", avisarGuardadoPendiente);

    document.getElementById("btnMenu")
        ?.addEventListener("click", () => {
            document.getElementById("menuDropdown")
                ?.classList.toggle("visible");
        });
}


async function avisarGuardadoPendiente() {
    if (carrito.length === 0) {
        alert("Agrega al menos un producto antes de finalizar la venta.");
        return;
    }

    const boton = document.getElementById("btnFinalizar");
    const totales = calcularTotales();

    if (!confirm(`¿Confirmas la venta por ${formatoMoneda(totales.total)}?`)) {
        return;
    }

    if (boton) boton.disabled = true;

    try {
        const respuesta = await fetch("/api/ventas", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                productos: carrito.map(item => ({
                    id_producto: Number(item.id_producto),
                    cantidad: Number(item.cantidad)
                })),
                descuento: totales.descuento
            })
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(resultado.mensaje || "No se pudo registrar la venta.");
        }

        alert(
            `¡Venta registrada correctamente!\n` +
            `Número de venta: ${resultado.venta.id_venta}\n` +
            `Total: ${formatoMoneda(resultado.venta.total)}`
        );

        carrito = [];

        const campoDescuento = document.getElementById("descuento");
        if (campoDescuento) campoDescuento.value = 0;

        mostrarCarrito();
        await cargarProductos();

    } catch (error) {
        console.error("Error al finalizar la venta:", error);
        alert(error.message || "No se pudo conectar con el servidor.");
    } finally {
        if (boton) boton.disabled = false;
    }
}


document.addEventListener("DOMContentLoaded", () => {
    configurarEventos();
    mostrarCarrito();
    cargarProductos();
});