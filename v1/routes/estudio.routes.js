import express from "express";
import {
    crearEstudio,
    listarMisUsuarios,
    agregarUsuario,
    verMovimientosDeUsuario,
    exportarMovimientos
} from "../controllers/estudio.controllers.js";
import { validateBodyMiddleware } from "../middlewares/validateBody.middleware.js";
import { soloAdmin } from "../middlewares/soloAdmin.middleware.js";
import { soloEstudio } from "../middlewares/soloEstudio.middleware.js";
import { crearEstudioSchema } from "../validators/estudio.validators.js";

const router = express.Router({ mergeParams: true });

router.post("/", soloAdmin, validateBodyMiddleware(crearEstudioSchema), crearEstudio);
router.get("/usuarios", soloEstudio, listarMisUsuarios);
router.patch("/usuarios/:nombreUsuario", soloEstudio, agregarUsuario);
router.get("/usuarios/:usuarioId/movimientos", soloEstudio, verMovimientosDeUsuario);
router.get("/usuarios/:usuarioId/exportar", soloEstudio, exportarMovimientos);

export default router;
