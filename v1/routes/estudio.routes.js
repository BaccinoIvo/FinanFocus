import express from "express";
import {
    crearEstudio,
    listarMisUsuarios,
    crearInvitacion,
    listarInvitaciones,
    crearPerfilSombra,
    quitarUsuario,
    verMovimientosDeUsuario,
    exportarMovimientos,
    crearMovimientoDeSombra,
    actualizarMovimientoDeSombra,
    eliminarMovimientoDeSombra,
    subirComprobanteDeSombra
} from "../controllers/estudio.controllers.js";
import { validateBodyMiddleware } from "../middlewares/validateBody.middleware.js";
import { soloAdmin } from "../middlewares/soloAdmin.middleware.js";
import { soloEstudio } from "../middlewares/soloEstudio.middleware.js";
import { estudioActivo } from "../middlewares/estudioActivo.middleware.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";
import { crearEstudioSchema, invitacionSchema, perfilSombraSchema } from "../validators/estudio.validators.js";
import { actualizarMovimientoSchema, crearMovimientoSchema } from "../validators/movimiento.validators.js";

const router = express.Router({ mergeParams: true });

router.post("/", soloAdmin, validateBodyMiddleware(crearEstudioSchema), crearEstudio);

// Cartera de clientes
router.get("/usuarios", soloEstudio, listarMisUsuarios);
router.delete("/usuarios/:usuarioId", soloEstudio, quitarUsuario);

// Vinculación segura: invitación de un solo uso (48 h) y perfiles sombra
router.get("/invitaciones", soloEstudio, listarInvitaciones);
router.post("/invitaciones", soloEstudio, estudioActivo, validateBodyMiddleware(invitacionSchema), crearInvitacion);
router.post("/perfiles-sombra", soloEstudio, estudioActivo, validateBodyMiddleware(perfilSombraSchema), crearPerfilSombra);

// Datos de un cliente
router.get("/usuarios/:usuarioId/movimientos", soloEstudio, verMovimientosDeUsuario);
router.get("/usuarios/:usuarioId/exportar", soloEstudio, estudioActivo, exportarMovimientos);

// Carga en nombre de un perfil sombra
router.post("/usuarios/:usuarioId/movimientos", soloEstudio, estudioActivo, validateBodyMiddleware(crearMovimientoSchema), crearMovimientoDeSombra);
router.put("/usuarios/:usuarioId/movimientos/:id", soloEstudio, estudioActivo, validateBodyMiddleware(actualizarMovimientoSchema), actualizarMovimientoDeSombra);
router.delete("/usuarios/:usuarioId/movimientos/:id", soloEstudio, estudioActivo, eliminarMovimientoDeSombra);
router.post("/usuarios/:usuarioId/movimientos/:id/imagenes", soloEstudio, estudioActivo, uploadMiddleware.single("comprobante"), subirComprobanteDeSombra);

export default router;
