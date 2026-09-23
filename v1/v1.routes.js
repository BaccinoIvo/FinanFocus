import express from "express";
import { authenticateToken } from "./middlewares/authorization.middleware.js";
import authRouter from "./routes/auth.routes.js";
import usuariosRouter from "./routes/usuarios.routes.js";
import categoriaRouter from "./routes/categoria.routes.js";
import movimientoRouter from "./routes/movimiento.routes.js";
import cotizacionesRouter from "./routes/cotizaciones.routes.js";
import resumenRouter from "./routes/resumen.routes.js";
import comprobantesRouter from "./routes/comprobantes.routes.js";

const router = express.Router({ mergeParams: true });

// Rutas desprotegidas
router.use("/auth", authRouter);

// A partir de acá, todo requiere token
router.use(authenticateToken);

// Rutas protegidas
router.use("/usuarios", usuariosRouter);
router.use("/categorias", categoriaRouter);
router.use("/movimientos", movimientoRouter);
router.use("/cotizaciones", cotizacionesRouter);
router.use("/resumen-fiscal", resumenRouter);
router.use("/comprobantes", comprobantesRouter);

export default router;
