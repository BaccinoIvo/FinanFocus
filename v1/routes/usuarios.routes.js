import express from "express";
import { cambiarPlan } from "../controllers/usuarios.controllers.js";

const router = express.Router({ mergeParams: true });

router.patch("/plan", cambiarPlan);

export default router;
