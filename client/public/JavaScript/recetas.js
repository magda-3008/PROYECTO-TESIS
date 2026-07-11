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

function formatearUnidadHumana(cantidad, unidad, nombreInsumo) {
    const num = parseFloat(cantidad);
    const unidadLimpia = unidad.trim().toLowerCase();
    const nombreLimpio = nombreInsumo.trim().toLowerCase();

    // =================================================================
    // 1. DICCIONARIO DE CASOS ESPECIALES (Mapeo por nombre exacto)
    // =================================================================

    // Caso Especial: Chocobananos y postres con Chispas (Libras a Cucharadas)
    if (nombreLimpio.includes('chispa')) {
        if (num === 0.016) return '1/2 cucharada';
        if (num === 0.05) return '1 cucharada y media';
        if (num === 0.1) return '3 cucharadas'; // Respaldo proporcional si escala
        return `${num} lb`; // Por si acaso cambia drásticamente la cantidad
    }

    // Caso Especial: Pioquinto / Tortas (Evitar "0.25 unidades" o "1/4 de unidad")
    if (nombreLimpio.includes('torta')) {
        if (num === 0.25) return '1/4 de torta entera';
        if (num === 0.5) return '1/2 torta entera';
        return num === 1 ? '1 torta entera' : `${num} tortas enteras`;
    }
    
    // Caso Especial: Pajillas (Evitar que diga "1 caja" en la receta)
    if (nombreLimpio.includes('pajilla')) {
        return num === 1 ? '1 pajilla' : `${num} pajillas`;
    }

    // Caso Especial: Vasos (Asegurar que diga unidades/vasos, no paquetes)
    if (nombreLimpio.includes('vaso')) {
        return num === 1 ? '1 vaso' : `${num} vasos`;
    }

    // Caso Especial: Cucharas / Cucharitas físicas
    if (nombreLimpio.includes('cuchara')) {
        return num === 1 ? '1 cuchara' : `${num} cucharas`;
    }

    // Caso Especial: Platos o Moldes
    if (nombreLimpio.includes('plato') || nombreLimpio.includes('molde') || nombreLimpio.includes('palillo') || nombreLimpio.includes('cono') || nombreLimpio.includes('malvavisco')) {
        return num === 1 ? '1 unidad' : `${num} unidades`;
    }

    // Caso Especial: Bolsas (Helados, hielo, o empaques genéricos)
    if (nombreLimpio.includes('bolsa')) {
        return num === 1 ? '1 bolsa' : `${num} bolsas`;
    }


    // =================================================================
    // 2. REGLAS GENERALES POR UNIDAD DE MEDIDA
    // =================================================================

    if (unidadLimpia === 'mililitros' || unidadLimpia === 'mililitro') {
        if (num === 7.5) return '1/2 cucharada';
        if (num === 15) return '1 cucharada';
        if (num === 30) return '2 cucharadas';
        if (num === 0.5) return '1/2 vaso'; 
        if (num === 1) return '1 vaso';
        return `${num} ml`; 
    }

    if (unidadLimpia === 'libra' || unidadLimpia === 'libras') {
        if (num === 0.03) return '1 cucharada';
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
        if (num === 0.5) return '2 tazas';
        return `${num} L`;
    }

    if (unidadLimpia === 'paquete' || unidadLimpia === 'bolsa') {
        if (num === 0.25) return `1/4 de ${unidadLimpia}`;
        if (num === 0.5) return `1/2 ${unidadLimpia}`;
        return num === 1 ? `1 ${unidadLimpia}` : `${num} ${unidadLimpia}s`;
    }

    if (unidadLimpia === 'unidad(es)' || unidadLimpia === 'unidad') {
        return num === 1 ? `${num} unidad` : `${num} unidades`;
    }

    // Respaldo final si no entró en ninguna regla
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