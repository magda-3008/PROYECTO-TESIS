document.addEventListener("DOMContentLoaded", () => {
    cargarIngredientes();
    cargarRecetas();

    const selectIngrediente = document.getElementById("ingrediente");
    
    selectIngrediente.addEventListener("change", (e) => {
        const idSeleccionado = e.target.value;
        
        // Control de seguridad: Si es vacío, es la palabra "null", o el string "Ingrediente"
        if (!idSeleccionado || idSeleccionado === "null" || idSeleccionado === "Ingrediente" || idSeleccionado === "") {
            cargarRecetas(); // Carga todas las recetas sin filtros
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

        // Limpiamos para asegurarnos de que solo quede la opción por defecto limpia
        select.innerHTML = '<option value="">Ingrediente</option>';

        ingredientes.forEach((ingrediente) => {
            const option = document.createElement("option");
            
            // Usamos id_ma, o si es nulo, usamos el id del producto elaborado
            option.value = ingrediente.id_ma || ingrediente.id_producto_insumo || ingrediente.id;
            option.textContent = ingrediente.nombre;

            // Solo agregamos la opción si logramos rescatar un ID válido
            if (option.value && option.value !== "null") {
                select.appendChild(option);
            }
        });

    } catch (error) {
        console.error(error);
    }
}

async function cargarRecetas(idIngrediente = "") {

    console.log("Llamando a fetch con ID:", idIngrediente);
    
    try {

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
     
        contenedor.innerHTML = "";

        // Si la API no devuelve ninguna receta con ese ingrediente
        if (recetas.length === 0) {
            contenedor.innerHTML = `<p class="text-muted text-center w-100 mt-4">No hay recetas que utilicen este ingrediente.</p>`;
            return;
        }

        recetas.forEach((receta) => {
            const tarjeta = document.createElement("div");
            tarjeta.className = "card tarjeta-receta";

            // Si imagen_url es null o no existe, usamos una imagen genérica o transparente
         const urlImagen = receta.imagen_url && receta.imagen_url !== "null" 
        ? receta.imagen_url 
        : "https://placehold.co/300x200?text=Sin+Imagen";

           tarjeta.innerHTML = `
        <img src="${urlImagen}" class="card-img-top imagen-receta" alt="${receta.nombre_receta}">
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

        const urlImagenModal = receta.imagen_url && receta.imagen_url !== "null" 
    ? receta.imagen_url 
    : "https://placehold.co/600x400?text=Sin+Imagen";

        document.getElementById("tituloModal").textContent = receta.nombre_receta;

        const contenido = document.getElementById("contenidoModal");
        
        contenido.innerHTML = `
            <img src="${urlImagenModal}" class="imagen-modal">
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

// En recetas.js
selectIngrediente.addEventListener("change", (e) => {
    const idSeleccionado = e.target.value;
    
    console.log("ID seleccionado en el select:", idSeleccionado); // <-- Para auditar

    if (!idSeleccionado || idSeleccionado === "null" || idSeleccionado === "Ingrediente" || idSeleccionado === "") {
        cargarRecetas(); 
    } else {
        cargarRecetas(idSeleccionado);
    }
});