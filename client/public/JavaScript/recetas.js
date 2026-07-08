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

            contenedor.appendChild(tarjeta);
        });

    } catch (error) {
        console.error(error);
    }
}