new Chart(document.getElementById("graficoSemanal"),{

    type:"bar",

    data:{

        labels:[
            "Lun",
            "Mar",
            "Mié",
            "Jue",
            "Vie",
            "Sáb",
            "Dom"
        ],

        datasets:[{

            label:"Ventas",

            data:[
                300,
                450,
                280,
                510,
                620,
                980,
                400
            ],

            borderRadius:12,

            backgroundColor:"#ff8cb3"

        }]

    }

});