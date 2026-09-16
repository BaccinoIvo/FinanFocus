import express from "express";
import {
    crearMovimiento,
    listarMovimientos,
    obtenerMovimiento,
    actualizarMovimiento,
    eliminarMovimiento,
    subirComprobante
} from "../controllers/movimiento.controllers.js";
import { validateBodyMiddleware } from "../middlewares/validateBody.middleware.js";
import { validarLimitePlan } from "../middlewares/validarLimitePlan.middleware.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import { crearMovimientoSchema, actualizarMovimientoSchema } from "../validators/movimiento.validators.js";

const router = express.Router({ mergeParams: true });

// El límite de plan se valida SOLO al crear (alta), como pide la letra.
router.post("/", validarLimitePlan, validateBodyMiddleware(crearMovimientoSchema), crearMovimiento);
router.get("/", listarMovimientos);
router.get("/:id", obtenerMovimiento);
router.put("/:id", validateBodyMiddleware(actualizarMovimientoSchema), actualizarMovimiento);
router.delete("/:id", eliminarMovimiento);
router.post("/:id/imagenes", uploadMiddleware.single("comprobante"), subirComprobante);

export default router;
