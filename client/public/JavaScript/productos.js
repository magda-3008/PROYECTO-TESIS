let tabla = null;

// //menú de acciones
// const menuAcciones = [
//     {
//         label: "📉 Registrar pérdida",
//         action: (e, cell) => abrirModalPerdida(cell.getRow().getData())
//     },
//     {
//         label: "📦 Registrar entrada",
//         action: (e, cell) => abrirModalEntrada(cell.getRow().getData())
//     },
//     {
//         label: "📄 Ver historial",
//         action: (e, cell) => abrirHistorial(cell.getRow().getData())
//     }
// ];

//configuración de vistas
const vistas = {
    inventario: {
        endpoint: "/api/productos",
        columns: [
            { title: "Nombre del producto", field: "nombre" },
            { title: "Tipo", field: "tipo", hozAlign: "center" },
            { title: "Precio de venta", field: "precio_venta", formatter: formatoMoneda, hozAlign: "center" },
            { title: "Costo de compra/producción", field: "costo", formatter: formatoMoneda, hozAlign: "center" },
            { title: "Margen de ganancia bruta esperado (%)", field: "margen_gananciab_esperado", variableHeight: true, formatter: formatoPorcentaje, hozAlign: "center"},
            { title: "Estado", field: "estado", hozAlign: "center" },
            { title: "Existencias", field: "stock_actual", hozAlign: "center" },
            {
                title:"Acciones",
                hozAlign:"center",
                headerSort:false,
                formatter:function(){
                return `
                    <div class="acciones-tabla">

                        <button class="btnAccion btnPerdida"
                                title="Registrar pérdida">
                            <i class="bi bi-cart-dash"></i>
                        </button>

                        <button class="btnAccion btnEntrada"
                                title="Registrar entrada">
                            <i class="bi bi-cart-plus"></i>
                        </button>

                        <button class="btnAccion btnHistorial"
                                title="Ver historial">
                            <i class="bi bi-clock-history"></i>
                        </button>

                    </div>
                `;

            },

                cellClick:function(e, cell){

                    const producto = cell.getRow().getData();

                    if(e.target.classList.contains("accion-perdida")){
                        abrirModalPerdida(producto);
                    }

                    if(e.target.classList.contains("accion-entrada")){
                        abrirModalEntrada(producto);
                    }

                    if(e.target.classList.contains("accion-historial")){
                        abrirHistorial(producto);
                    }

                }
            }
                    ]
                },

    analisis: {
        endpoint: "/api/productos/analisis",
        columns: [
            { title: "Producto", field: "nombre_producto" },
            { title: "Costo unitario de producción", field: "costo_unitario_prod", formatter: formatoMoneda },
            { title: "Margen esperado (C$)", field: "margen_esperado_cordobas", formatter: formatoMoneda },
            { title: "Precio actual", field: "precio_venta_actual", formatter: formatoMoneda },
            { title: "Precio sugerido", field: "precio_venta_sugerido", formatter: formatoMoneda },
            { title: "Ganancia real", field: "ganancia_real_cordobas", formatter: formatoMoneda }
        ]
    }
};

//cargar vista
async function cargarVista(vista){

    if(tabla){
        tabla.destroy();
    }

    crearFiltros(vista);

    const configuracion = vistas[vista];

    const respuesta = await fetch(configuracion.endpoint);

    const datos = await respuesta.json();

    tabla = new Tabulator("#tablaProductos",{

    data: datos,
    layout: "fitColumns",
    responsiveLayout: "collapse",
    columnHeaderVertAlign: "middle",
    pagination: true,
    paginationSize: 30,
    reactiveData: true,

    rowHeader:{
        formatter:"rownum",
        width:40,
        hozAlign:"center",
        headerSort:false,
        frozen:true
    },

    columns: configuracion.columns

});

    inicializarEventosFiltros(vista);

}

//crear filtros
function crearFiltros(vista){
    const panel = document.getElementById("panelFiltros");

    switch(vista){

        case "inventario":
            panel.innerHTML = `
            <h3>Filtrar por:</h3>
                <div class="row g-2">

                    <div class="col-md-3">
                        <select id="filtroEstado" class="form-select">
                            <option value="">Todos los estados</option>
                            <option value="Activo">Activo</option>
                            <option value="Inactivo">Inactivo</option>
                        </select>
                    </div>

                    <div class="col-md-3">
                        <select id="filtroStock" class="form-select">
                            <option value="">Todas las existencias</option>
                            <option value="0">Sin stock</option>
                            <option value="bajo">Stock bajo</option>
                            <option value="normal">Con stock</option>
                        </select>
                    </div>

                </div>
            `;

            break;

        case "analisis":
            panel.innerHTML = `
            <h3>Filtrar por:</h3>
                <div class="row g-2">
                    <div class="col-md-3">
                        <input
                            id="gananciaMin"
                            type="number"
                            class="form-control"
                            placeholder="Ganancia mínima">
                    </div>

                    <div class="col-md-3">
                        <input
                            id="gananciaMax"
                            type="number"
                            class="form-control"
                            placeholder="Ganancia máxima">
                    </div>

                    <div class="col-md-3">
                        <select id="filtroPrecio" class="form-select">
                            <option value="">Todos los precios</option>
                            <option value="mayor">Precio sugerido mayor</option>
                            <option value="menor">Precio sugerido menor</option>
                        </select>
                    </div>
                </div>
            `;
            break;
    }
}

function inicializarEventosFiltros(vista){

    if(vista === "inventario"){

        document.getElementById("filtroEstado")
            .addEventListener("change", aplicarFiltros);

        document.getElementById("filtroStock")
            .addEventListener("change", aplicarFiltros);

    }

    if(vista === "analisis"){

        document.getElementById("gananciaMin")
            .addEventListener("input", aplicarFiltros);

        document.getElementById("gananciaMax")
            .addEventListener("input", aplicarFiltros);

        document.getElementById("filtroPrecio")
            .addEventListener("change", aplicarFiltros);

    }

}

function aplicarFiltros(){

    const texto = document
    .getElementById("buscar")
    .value
    .toLowerCase();

    const vistaActual = document
        .querySelector("#tabsProductos .active")
        .dataset.vista;

    tabla.setFilter(function(data){

        let coincide = true;

        // Buscador
        if(texto){

            coincide = Object.values(data).some(valor =>
                String(valor)
                    .toLowerCase()
                    .includes(texto)
            );

        }

        if(vistaActual === "inventario"){

            const estado = document.getElementById("filtroEstado")?.value ?? "";
            const stock = document.getElementById("filtroStock")?.value ?? "";

            if(coincide && estado){

                coincide = data.estado === estado;

            }

            if(coincide){

                switch(stock){

                    case "0":
                        coincide = Number(data.stock_actual) === 0;
                        break;

                    case "bajo":
                        coincide = Number(data.stock_actual) <= 5;
                        break;

                    case "normal":
                        coincide = Number(data.stock_actual) > 5;
                        break;

                }

            }

        }

        else if(vistaActual === "analisis"){

            const min = Number(document.getElementById("gananciaMin")?.value || 0);
            const max = Number(document.getElementById("gananciaMax")?.value || Infinity);
            const precio = document.getElementById("filtroPrecio")?.value ?? "";

            if(coincide){

                coincide =
                    Number(data.ganancia_real_cordobas) >= min &&
                    Number(data.ganancia_real_cordobas) <= max;

            }

            if(coincide && precio === "mayor"){

                coincide =
                    Number(data.precio_venta_sugerido) >
                    Number(data.precio_venta_actual);

            }

            if(coincide && precio === "menor"){

                coincide =
                    Number(data.precio_venta_sugerido) <
                    Number(data.precio_venta_actual);

            }

        }

        return coincide;

    });

}

//cambio de pestañas
document.querySelectorAll("#tabsProductos .nav-link").forEach(tab=>{

    tab.addEventListener("click",()=>{

        document
            .querySelector("#tabsProductos .active")
            .classList.remove("active");

        tab.classList.add("active");

        cargarVista(tab.dataset.vista);

    });

});

//acciones
function abrirModalPerdida(producto){

    console.log(producto);

}

function abrirModalEntrada(producto){

    console.log(producto);

}

function abrirHistorial(producto){

    console.log(producto);

}

const buscador = document.getElementById("buscar");

buscador.addEventListener("input", aplicarFiltros);

//inicio
cargarVista("inventario");