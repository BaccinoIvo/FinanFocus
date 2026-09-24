import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./v1/config/db.config.js";
import notFoundMiddleware from "./v1/middlewares/notFound.middleware.js";
import v1 from "./v1/v1.routes.js";


await connectDB();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.json({ message: "API FinanFocus - v1" });
});

app.use("/v1", v1);

// Ruta no encontrada
app.use(notFoundMiddleware);

// Manejador de errores central: evita exponer stack traces (buena práctica OWASP)
app.use((err, req, res, next) => {
    // Errores de multer (archivo muy grande, tipo no permitido)
    if (err.name === "MulterError" || err.message?.startsWith("Solo se permiten")) {
        return res.status(400).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: "Error interno del servidor" });
});

export default app;
