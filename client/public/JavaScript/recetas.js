document.addEventListener("DOMContentLoaded", () => {
    cargarIngredientes();
    cargarRecetas();

    const selectIngrediente = document.getElementById("ingrediente");
    selectIngrediente.addEventListener("change", (e) => {
        const idSeleccionado = e.target.value;
        
        // Si vuelve a seleccionar la opción por defecto ("Ingrediente"), cargamos todas
        if (idSeleccionado === "Ingrediente" || idSeleccionado === "") {
            cargarRecetas();
        } else {
            cargarRecetas(idSeleccionado);
        }
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


async function cargarRecetas(idIngrediente = "") {
    try {
        // Construimos la URL. Si hay ID, queda tipo: /api/recetas?ingrediente=3
        let url = "/api/recetas";
        if (idIngrediente) {
            url += `?ingrediente=${idIngrediente}`;
        }

        const respuesta = await fetch(url);

        if (!respuesta.ok) {
            throw new Error("Error al obtener las recetas");
        }

        const recetas = await respuesta.json();

        const contenedor = document.getElementById("contenedor-recetas");
        
        // ¡CRUCIAL! Limpiamos el contenedor para que no se acumulen las recetas anteriores
        contenedor.innerHTML = "";

        // Si la API no devuelve ninguna receta con ese ingrediente
        if (recetas.length === 0) {
            contenedor.innerHTML = `<p class="text-muted text-center w-100 mt-4">No hay recetas que utilicen este ingrediente.</p>`;
            return;
        }

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

        document.getElementById("tituloModal").textContent = receta.nombre_receta;

        const contenido = document.getElementById("contenidoModal");
        
        contenido.innerHTML = `
            <img src="${receta.imagen_url}" class="imagen-modal">
            <p><strong>Las medidas de esta receta producen una cantidad base de:</strong> ${receta.cantidad_producida_base} ${receta.nombre_receta}</p>
            <h5>Ingredientes</h5>
            <ul id="listaIngredientes"></ul>
            <h5>Método de preparación:</h5>
            <p style="text-align: justify;">${receta.descripcion}</p>
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