import express from "express";
import {
    crearCategoria,
    listarCategorias,
    actualizarCategoria,
    eliminarCategoria
} from "../controllers/categoria.controllers.js";
import { validateBodyMiddleware } from "../middlewares/validateBody.middleware.js";
import { crearCategoriaSchema, actualizarCategoriaSchema } from "../validators/categoria.validators.js";

const router = express.Router({ mergeParams: true });

router.post("/", validateBodyMiddleware(crearCategoriaSchema), crearCategoria);
router.get("/", listarCategorias);
router.put("/:id", validateBodyMiddleware(actualizarCategoriaSchema), actualizarCategoria);
router.delete("/:id", eliminarCategoria);

export default router;
