import express from "express";
import { login, register } from "../controllers/auth.controllers.js";
import { validateBodyMiddleware } from "../middlewares/validateBody.middleware.js";
import { loginSchema, registerSchema } from "../validators/auth.validators.js";

const router = express.Router({ mergeParams: true });

router.post("/login", validateBodyMiddleware(loginSchema), login);
router.post("/register", validateBodyMiddleware(registerSchema), register);

export default router;
