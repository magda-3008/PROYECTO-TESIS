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

// Función avanzada para convertir cantidades técnicas a lenguaje de cocina real
function formatearUnidadHumana(cantidad, unidad, nombreInsumo) {
    const num = parseFloat(cantidad);
    const unidadLimpia = unidad.trim().toLowerCase();
    const nombreLimpio = nombreInsumo.trim().toLowerCase();

    // 1. Validaciones específicas combinando ingrediente y cantidad (según tu tabla)
    if (unidadLimpia === 'mililitros' || unidadLimpia === 'mililitro') {
        if (num === 7.5) return '1/2 cucharada';
        if (num === 15) return '1 cucharada';
        if (num === 30) return '2 cucharadas';
        if (num === 0.5) return '1/2 vaso'; // Caso específico de saborizantes/líquidos en vasos
        if (num === 1) return '1 vaso';
        return `${num} ml`; // Respaldo si cambia la cantidad
    }

    if (unidadLimpia === 'libra' || unidadLimpia === 'libras') {
        if (num === 0.06) return '2 cucharadas';
        if (num === 0.11) return '4 cucharadas';
        if (num === 0.25) return '1/4 de libra';
        if (num === 0.5) return '1/2 libra';
        if (num === 0.75) return '3/4 de libra';
        if (num === 1.5) return 'una libra y media';
        return `${num} lb`;
    }

    if (unidadLimpia === 'gramos' || unidadLimpia === 'gramo') {
        if (num === 20 && nombreLimpio.includes('chantilly')) return '1 sprayado';
        if (num === 15 && nombreLimpio.includes('bicarbonato')) return '1 cucharada';
        if (num === 30 && nombreLimpio.includes('bicarbonato')) return '2 cucharadas';
        if (num === 24 && nombreLimpio.includes('gelatina')) return '3 cucharadas';
        return `${num} g`;
    }

    if (unidadLimpia === 'litro' || unidadLimpia === 'litros') {
        if (num === 0.25) return '1 taza';
        if (num === 0.5) return '2 tazas' || '1/2 litro'; // Ajustable según prefieras
        return `${num} L`;
    }

    // 2. Fracciones para paquetes o bolsas
    if (unidadLimpia === 'paquete' || unidadLimpia === 'bolsa') {
        if (num === 0.25) return `1/4 de ${unidadLimpia}`;
        if (num === 0.5) return `1/2 ${unidadLimpia}`;
        return num === 1 ? `1 ${unidadLimpia}` : `${num} ${unidadLimpia}s`;
    }

    // 3. Unidades genéricas (Vasos, Pajillas, Cucharas, etc.)
    if (unidadLimpia === 'unidad(es)' || unidadLimpia === 'unidad') {
        // Si el insumo ya es "Vasos 4 oz", "Cucharas", "Pajillas", solo mostramos el número y su nombre natural
        if (num === 1) return `1 ${nombreInsumo.toLowerCase().replace(/s\b/, '')}`; // Quita la 's' final si es singular
        return `${num} ${nombreInsumo.toLowerCase()}`;
    }

    // Retorno por defecto si no cumple ninguna regla anterior
    return `${num} ${unidad}`;
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
            <p>${receta.descripcion}</p>
        `;

        const lista = document.getElementById("listaIngredientes");

        detalle.forEach(item => {
            // Pasamos el nombre del insumo también para evaluar excepciones como el "Chantilly"
            const textoMedida = formatearUnidadHumana(item.cantidad_utilizada, item.unidad_medida, item.nombre_insumo);

            lista.innerHTML += `
                <li>
                    <strong>${item.nombre_insumo}</strong> 
                    <span class="text-muted">(${item.tipo_insumo})</span> 
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

/* async function cargarDetalleReceta(idReceta) {

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

    <p><strong>Las medidas de esta receta producen una cantidad base de:</strong> ${receta.cantidad_producida_base} ${receta.nombre_receta}</p>

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

});

 contenido.innerHTML += `
        <h5>Método de preparación:</h5>
        <p>${receta.descripcion}</p>
    `;
        const modal = new bootstrap.Modal(
            document.getElementById("modalReceta")
        );

        modal.show();

    } catch (error) {

        console.error(error);

    }

} */