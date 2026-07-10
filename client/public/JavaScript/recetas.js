document.addEventListener("DOMContentLoaded", () => {
    cargarIngredientes();
    cargarRecetas();
});

async function cargarIngredientes() {
    try {
        const respuesta = await fetch("/api/materiaprima");

        if (!respuesta.ok) {
            throw new Error("Error al obtener los ingredientes");
        }

        const ingredientes = await respuesta.json();

        const select = document.getElementById("ingrediente");

        ingredientes.forEach((ingrediente) => {
            const option = document.createElement("option");

            option.value = ingrediente.id_ma;
            option.textContent = ingrediente.nombre;

            select.appendChild(option);
        });

    } catch (error) {
        console.error(error);
    }
}




async function cargarRecetas() {
    try {
        const respuesta = await fetch("/api/recetas");

        if (!respuesta.ok) {
            throw new Error("Error al obtener las recetas");
        }

        const recetas = await respuesta.json();

        const contenedor = document.getElementById("contenedor-recetas");

        recetas.forEach((receta) => {
            const tarjeta = document.createElement("div");

            tarjeta.className = "card tarjeta-receta";

            tarjeta.innerHTML = `
                <img src="${receta.imagen_url}" class="card-img-top imagen-receta" alt="Imagen">

                <div class="card-body">
                    <h5 class="card-title titulo-receta">${receta.nombre_receta}</h5>
                </div>
            `;

             tarjeta.addEventListener("click", () => {
                cargarDetalleReceta(receta.id_receta);
             });

            contenedor.appendChild(tarjeta);
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

document.getElementById("tituloModal").textContent =
    receta.nombre_receta;

const contenido = document.getElementById("contenidoModal");

contenido.innerHTML = `
    <img src="${receta.imagen_url}" class="imagen-modal">

    <p><strong>Cantidad producida:</strong> ${receta.cantidad_producida_base}</p>

    <h5>Ingredientes</h5>

    <ul id="listaIngredientes"></ul>
`;

const lista = document.getElementById("listaIngredientes");

detalle.forEach(item => {

    lista.innerHTML += `
        <li>
            ${item.nombre_insumo}
            (${item.tipo_insumo})
            - ${item.cantidad_utilizada}
            ${item.unidad_medida}
        </li>
    `;

    contenido.innerHTML = `
    <p><strong>Cantidad producida:</strong> ${receta.cantidad_producida_base}</p>

    <h5>Método de preparación:</h5>
    <p>${receta.descripcion}</p>
`;
});
        const modal = new bootstrap.Modal(
            document.getElementById("modalReceta")
        );

        modal.show();

    } catch (error) {

        console.error(error);

    }

}