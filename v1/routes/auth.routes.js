import express from "express";
import { login, register } from "../controllers/auth.controllers.js";
import { limitadorLogin, limitadorRegistro } from "../middlewares/limitadores.middleware.js";
import { validateBodyMiddleware } from "../middlewares/validateBody.middleware.js";
import { loginSchema, registerSchema } from "../validators/auth.validators.js";

const router = express.Router({ mergeParams: true });

router.post("/login", limitadorLogin, validateBodyMiddleware(loginSchema), login);
router.post("/register", limitadorRegistro, validateBodyMiddleware(registerSchema), register);

export default router;
