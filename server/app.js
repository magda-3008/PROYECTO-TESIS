const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./config/db");
const productoRoutes = require("./routes/productoRoutes");
const recetaRoutes = require("./routes/recetasRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Servir los archivos del frontend
app.use(express.static(path.join(__dirname, "../client/public")));

// Página principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/public/index.html"));
});

app.use("/api/productos", productoRoutes);
app.use("/api/recetas", recetaRoutes);
app.get("/api/detalle_receta/:id", async (req, res) => {

    const { id } = req.params;

    try {
        const [rows] = await conexion.query(
            `SELECT *
             FROM detalle_receta
             WHERE id_receta = ?`,
            [id]
        );

        res.json(rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Error al obtener detalles de la receta"
        });
    }
});


const PORT = process.env.PORT || 3000;

app.get("/api/test-db", async (req, res) => {
    try {
        const resultado = await pool.query("SELECT NOW()");

        res.json({
            mensaje: "Conexión exitosa",
            fechaServidor: resultado.rows[0].now
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            mensaje: "Error de conexión"
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});