import express from "express";
import { extraerComprobante } from "../controllers/comprobantes.controllers.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";

const router = express.Router({ mergeParams: true });

router.post("/extraer", uploadMiddleware.single("comprobante"), extraerComprobante);

export default router;
