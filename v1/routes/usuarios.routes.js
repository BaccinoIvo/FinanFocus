import express from "express";
import {
    aceptarInvitacion, cambiarPassword, cambiarPlan, desvincularContador, editarPerfil, listarPlanes, obtenerPerfil, obtenerUso
} from "../controllers/usuarios.controllers.js";
import { validateBodyMiddleware } from "../middlewares/validateBody.middleware.js";
import { aceptarInvitacionSchema, cambiarPasswordSchema, cambiarPlanSchema, editarPerfilSchema } from "../validators/usuarios.validators.js";

const router = express.Router({ mergeParams: true });

router.get("/planes", listarPlanes);
router.get("/uso", obtenerUso);
router.get("/perfil", obtenerPerfil);
router.patch("/perfil", validateBodyMiddleware(editarPerfilSchema), editarPerfil);
router.patch("/password", validateBodyMiddleware(cambiarPasswordSchema), cambiarPassword);
router.patch("/plan", validateBodyMiddleware(cambiarPlanSchema), cambiarPlan);
router.post("/invitacion/aceptar", validateBodyMiddleware(aceptarInvitacionSchema), aceptarInvitacion);
router.delete("/contador", desvincularContador);

export default router;
