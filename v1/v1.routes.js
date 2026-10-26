import express from "express";
import mongoose from "mongoose";
import { authenticateToken } from "./middlewares/authorization.middleware.js";
import authRouter from "./routes/auth.routes.js";
import usuariosRouter from "./routes/usuarios.routes.js";
import categoriaRouter from "./routes/categoria.routes.js";
import movimientoRouter from "./routes/movimiento.routes.js";
import cotizacionesRouter from "./routes/cotizaciones.routes.js";
import resumenRouter from "./routes/resumen.routes.js";
import estudioRouter from "./routes/estudio.routes.js";
import comprobantesRouter from "./routes/comprobantes.routes.js";

const router = express.Router({ mergeParams: true });

// Rutas desprotegidas
router.use("/auth", authRouter);
router.get("/ping", (req, res) => {
    res.status(200).json({
        success: true,
        status: "active",
        message: "FinanFocus esta despierto.",
        timestamp: new Date().toISOString()
    });
});
// Estado real del servicio (incluye la base de datos): sirve para monitoreo.
router.get("/health", (req, res) => {
    const baseOk = mongoose.connection.readyState === 1;
    res.status(baseOk ? 200 : 503).json({
        status: baseOk ? "ok" : "degraded",
        base: baseOk ? "conectada" : "sin conexión",
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
    });
});
// A partir de acá, todo requiere token
router.use(authenticateToken);

// Rutas protegidas
router.use("/usuarios", usuariosRouter);
router.use("/categorias", categoriaRouter);
router.use("/movimientos", movimientoRouter);
router.use("/cotizaciones", cotizacionesRouter);
router.use("/resumen-fiscal", resumenRouter);
router.use("/comprobantes", comprobantesRouter);
router.use("/estudio", estudioRouter);


export default router;
