const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());

// Servir los archivos del frontend
app.use(express.static(path.join(__dirname, "../client/public")));

// Página principal
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/public/index.html"));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});