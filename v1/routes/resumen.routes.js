import express from "express";
import { resumenFiscal } from "../controllers/resumen.controllers.js";

const router = express.Router({ mergeParams: true });

router.get("/", resumenFiscal);

export default router;
