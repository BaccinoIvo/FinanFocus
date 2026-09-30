import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { connectDB } from "./v1/config/db.config.js";
import notFoundMiddleware from "./v1/middlewares/notFound.middleware.js";
import v1 from "./v1/v1.routes.js";

await connectDB();

const app = express();

const origenesPermitidos = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
    : ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5500"];

app.use(cors({
    origin: origenesPermitidos,
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: { message: "Demasiadas peticiones. Probá de nuevo en unos minutos." },
    standardHeaders: true,
    legacyHeaders: false
});

app.get("/", (req, res) => {
    res.json({ message: "API FinanFocus - v1" });
});

app.use("/v1", apiLimiter, v1);

app.use(notFoundMiddleware);

app.use((err, req, res, next) => {
    if (err.name === "MulterError" || err.message?.startsWith("Solo se permiten")) {
        return res.status(400).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: "Error interno del servidor" });
});

export default app;
