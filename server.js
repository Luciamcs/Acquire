// Entry point del servicio ACQUIRE
const mongoose = require("mongoose");
require("dotenv").config();

const express = require("express");
const acquireRoutes = require("./routes/acquireroutes");

const PORT = process.env.PORT || 3001;
// Puedes usar la misma DB que predict o una distinta.
// Ejemplo: misma instancia pero otra base de datos.
const MONGO_URI =process.env.MONGO_URI || "mongodb://localhost:27017/acquire";

const app = express();
app.use(express.json());

// Rutas del servicio ACQUIRE
app.use("/", acquireRoutes);

// Arranque del servidor
app.listen(PORT, async () => {
  const serverUrl = `http://localhost:${PORT}`;
  console.log(`[ACQUIRE] Servicio escuchando en ${serverUrl}`);

  try {
    await mongoose.connect(MONGO_URI);
    console.log("[ACQUIRE] Conexión a la base de datos establecida");
  } catch (err) {
    console.error("[ACQUIRE] Error al conectar con MongoDB:", err);
    process.exit(1);
  }
});
