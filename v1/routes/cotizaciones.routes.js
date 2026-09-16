import express from "express";
import { listarCotizaciones } from "../controllers/cotizaciones.controllers.js";

const router = express.Router({ mergeParams: true });

router.get("/", listarCotizaciones);

export default router;
