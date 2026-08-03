async function cargarModales() {
    const respuesta = await fetch("/modales/productoModales.html");
    const html = await respuesta.text();

    document.getElementById("contenedorModales").innerHTML = html;
}

cargarModales();