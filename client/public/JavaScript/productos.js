let tabla = null;

//menú de acciones
const menuAcciones = [
    {
        label: "📉 Registrar pérdida",
        action: (e, cell) => abrirModalPerdida(cell.getRow().getData())
    },
    {
        label: "📦 Registrar entrada",
        action: (e, cell) => abrirModalEntrada(cell.getRow().getData())
    },
    {
        label: "📄 Ver historial",
        action: (e, cell) => abrirHistorial(cell.getRow().getData())
    }
];

//configuración de vistas
const vistas = {
    inventario: {
        endpoint: "/api/productos",
        columns: [
            { title: "Nombre", field: "nombre" },
            { title: "Tipo", field: "tipo" },
            { title: "Precio de venta", field: "precio_venta" },
            { title: "Costo de compra/producción", field: "costo" },
            { title: "Margen de ganancia bruta esperado (%)", field: "margen_gananciab_esperado", formatter: "textarea", variableHeight: true},
            { title: "Estado", field: "estado" },
            { title: "Existencias", field: "stock_actual" },
            {
                title: "Acciones",
                formatter: () => '<i class="bi bi-three-dots-vertical"></i>',
                hozAlign: "center",
                width: 70,
                headerSort: false,
                clickMenu: menuAcciones
            }
        ]
    },

    analisis: {
        endpoint: "/api/productos/analisis",
        columns: [
            { title: "Producto", field: "nombre_producto" },
            { title: "Costo unitario de producción", field: "costo_unitario_prod" },
            { title: "Margen esperado (C$)", field: "margen_esperado_cordobas" },
            { title: "Precio actual", field: "precio_venta_actual" },
            { title: "Precio sugerido", field: "precio_venta_sugerido" },
            { title: "Ganancia real", field: "ganancia_real_cordobas" }
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

        rowHeader:{
            formatter:"rownum",
            headerSort:false,
            resizable:false,
            frozen:true,
            width:20
        },

        pagination:true,
        paginationSize:30,
        reactiveData:true,

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
                <div class="row g-2">
                    <div class="col-md-5">
                        <input
                            id="buscar"
                            class="form-control"
                            placeholder="Buscar producto...">
                    </div>

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
                <div class="row">
                    <div class="col-md-5">
                        <input
                            id="buscar"
                            class="form-control"
                            placeholder="Buscar producto...">
                    </div>
                </div>

            `;

            break;

    }

}

//eventos de filtros
function inicializarEventosFiltros(vista){

    document
        .getElementById("buscar")
        .addEventListener("input", aplicarFiltros);

    if(vista === "inventario"){

        document
            .getElementById("filtroEstado")
            .addEventListener("change", aplicarFiltros);

        document
            .getElementById("filtroStock")
            .addEventListener("change", aplicarFiltros);

    }

}

//filtrar
function aplicarFiltros(){

    const texto = document.getElementById("buscar").value.toLowerCase();
    const estado = document.getElementById("filtroEstado")?.value ?? "";
    const stock = document.getElementById("filtroStock")?.value ?? "";
    tabla.setFilter(function(data){

        let coincide = true;

        if(texto){
            coincide = Object.values(data).some(valor =>
                String(valor)
                    .toLowerCase()
                    .includes(texto)
            );
        }

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

//inicio
cargarVista("inventario");