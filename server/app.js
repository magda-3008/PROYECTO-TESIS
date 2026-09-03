const express = require("express");
const cors = require("cors");
const path = require("path");
const pool = require("./config/db");

//Rutas del sistema
const productoRoutes = require("./routes/productoRoutes");
const recetaRoutes = require("./routes/recetasRoutes");
const detalleRecetaRoutes = require("./routes/detalleRecetaRoutes");
const materiaPrimaRoutes = require("./routes/materiaPrimaRoutes");
const usuarioRoutes = require("./routes/usuariosRoutes");
const movimientoProductoRoutes = require("./routes/movimientoProductoRoutes");
const salidaProductoRoutes = require("./routes/salidaProductoRoutes");
const movimientoHistorial = require("./routes/movimientosHistorial");
const movimientoMPRoutes = require("./routes/movimientoMPRoutes");

const app = express();
app.use(cors());
app.use(express.json());
// Servir los archivos del frontend
app.use(express.static(path.join(__dirname, "../client/public")));
// Página principal
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "../client/public/index.html"));
});

//Llamado a las rutas
app.use("/api/productos", productoRoutes);
app.use("/api/recetas", recetaRoutes);
app.use("/api/detalle_receta", detalleRecetaRoutes);
app.use("/api/materiaprima", materiaPrimaRoutes);
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/entrada", movimientoProductoRoutes);
app.use("/api/salida", salidaProductoRoutes);
app.use("/api/historial", movimientoHistorial);
app.use("/api/entradaMP", movimientoMPRoutes);

const PORT = process.env.PORT || 3000;
app.get("/api/test-db", async (req, res) => {
	try {
		const resultado = await pool.query("SELECT NOW()");
		res.json({
			mensaje: "Conexión exitosa",
			fechaServidor: resultado.rows[0].now,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({
			mensaje: "Error de conexión",
		});
	}
});
app.listen(PORT, () => {
	console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
