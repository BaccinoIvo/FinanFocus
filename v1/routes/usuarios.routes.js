import express from "express";
import {
    aceptarInvitacion, cambiarPlan, desvincularContador, listarPlanes, obtenerUso
} from "../controllers/usuarios.controllers.js";
import { validateBodyMiddleware } from "../middlewares/validateBody.middleware.js";
import { aceptarInvitacionSchema, cambiarPlanSchema } from "../validators/usuarios.validators.js";

const router = express.Router({ mergeParams: true });

router.get("/planes", listarPlanes);
router.get("/uso", obtenerUso);
router.patch("/plan", validateBodyMiddleware(cambiarPlanSchema), cambiarPlan);
router.post("/invitacion/aceptar", validateBodyMiddleware(aceptarInvitacionSchema), aceptarInvitacion);
router.delete("/contador", desvincularContador);

export default router;
