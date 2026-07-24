document.addEventListener("DOMContentLoaded", () => {

    cargarIngredientes();
    cargarRecetas();

    const inputBuscar = document.getElementById("buscar-receta");
    const selectIngrediente = document.getElementById("ingrediente");

    let temporizador;

    inputBuscar.addEventListener("input", (e) => {

        clearTimeout(temporizador);

        temporizador = setTimeout(() => {

            const nombre = e.target.value.trim();
            const ingrediente = selectIngrediente.value;

            cargarRecetas(ingrediente, nombre);

        }, 300);

    });

    selectIngrediente.addEventListener("change", (e) => {

        const ingrediente = e.target.value;
        const nombre = inputBuscar.value.trim();

        cargarRecetas(ingrediente, nombre);

    });

});

async function cargarIngredientes() {
    try {
        const respuesta = await fetch("/api/materiaprima");

        if (!respuesta.ok) {
            throw new Error("Error al obtener los ingredientes");
        }

        const ingredientes = await respuesta.json();
        const select = document.getElementById("ingrediente");

        select.innerHTML = '<option value="">Ingrediente</option>';

        const ingredientesOcultos = [
            "Vasos 4 oz",
            "Pajillas",
            "Leña",
            "Cucharas",
            "Palillos",
            "Plato redondo",
            "Bolsas para helados",
            "Plato largo",
            "Vasos 5 oz",
            "Vasos 7 oz",
            "Vasos 10 oz",
            "Vasos 12 oz",
            "Vasos 14 oz",
            "Bolsas 2 libras"


        ];

        ingredientes.forEach((ingrediente) => {

            if (ingredientesOcultos.includes(ingrediente.nombre.toLowerCase())) {
                return;
            }

            const option = document.createElement("option");

            option.value = ingrediente.id_ma || ingrediente.id_producto_insumo || ingrediente.id;
            option.textContent = ingrediente.nombre;

            if (option.value && option.value !== "null") {
                select.appendChild(option);
            }
        });

    } catch (error) {
        console.error(error);
    }
}

async function cargarRecetas(idIngrediente = "", nombre = "") {
    try {

       let url = "/api/recetas";

const parametros = new URLSearchParams();

if (idIngrediente) {
    parametros.append("ingrediente", idIngrediente);
}

if (nombre) {
    parametros.append("buscar", nombre);
}

if (parametros.toString()) {
    url += "?" + parametros.toString();
}

        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error("Error al obtener las recetas");
        }

        const recetas = await respuesta.json();

        const contenedor = document.getElementById("contenedor-recetas");
     
        contenedor.innerHTML = "";

        // Si la API no devuelve ninguna receta con ese ingrediente
        if (recetas.length === 0) {
            contenedor.innerHTML = `<p class="text-muted text-center w-100 mt-4">No hay recetas que utilicen este ingrediente.</p>`;
            return;
        }

        recetas.forEach((receta) => {

        const urlImagen = receta.imagen_url && receta.imagen_url !== "null"
            ? receta.imagen_url
            : "https://placehold.co/300x200?text=Sin+Imagen";

        const columna = document.createElement("div");
        columna.className = "col-lg-4 col-md-6 d-flex justify-content-center";

        columna.innerHTML = `
            <div class="card tarjeta-receta">
                <img src="${urlImagen}" class="card-img-top imagen-receta" alt="${receta.nombre_receta}">
                <div class="card-body">
                    <h5 class="card-title titulo-receta">${receta.nombre_receta}</h5>
                </div>
            </div>
        `;

        columna.querySelector(".tarjeta-receta").addEventListener("click", () => {
            cargarDetalleReceta(receta.id_receta);
        });

    contenedor.appendChild(columna);
});

    } catch (error) {
        console.error(error);
    }
}

async function cargarDetalleReceta(idReceta) {
    try {
        const respuesta = await fetch(`/api/detalle_receta/${idReceta}`);

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener el detalle.");
        }

        const detalle = await respuesta.json();
        const receta = detalle[0];

        const urlImagenModal = receta.imagen_url && receta.imagen_url !== "null" 
    ? receta.imagen_url 
    : "https://placehold.co/600x400?text=Sin+Imagen";

        document.getElementById("tituloModal").textContent = receta.nombre_receta;

        const contenido = document.getElementById("contenidoModal");
        
        contenido.innerHTML = `
            <img src="${urlImagenModal}" class="imagen-modal">

            <div class="info-receta">
                <p>
                    <strong>Rendimiento:</strong>
                    ${receta.cantidad_producida_base} ${receta.nombre_receta}
                </p>
            </div>

            <h5>Ingredientes y materiales</h5>

            <ul id="listaIngredientes"></ul>

            <hr>

            <h5>Método de preparación</h5>

            <p class="descripcion-receta">
                ${receta.descripcion}
            </p>
        `;

        const lista = document.getElementById("listaIngredientes");

        detalle.forEach(item => {
            // Pasamos el nombre del insumo también para evaluar excepciones como el "Chantilly"
            const textoMedida = formatearUnidadHumana(item.cantidad_utilizada, item.unidad_medida, item.nombre_insumo);

            lista.innerHTML += `
                <li>
                    <strong>${item.nombre_insumo}</strong> 
                    - ${textoMedida}
                </li>
            `;
        });

        const modal = new bootstrap.Modal(document.getElementById("modalReceta"));
        modal.show();

    } catch (error) {
        console.error(error);
    }
}