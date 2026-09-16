import Joi from "joi";

export const registerSchema = Joi.object({
    nombreUsuario: Joi.string().min(3).max(30).required().messages({
        "string.min": "El nombre de usuario debe tener al menos {#limit} caracteres",
        "string.max": "El nombre de usuario no puede tener más de {#limit} caracteres",
        "any.required": "El nombre de usuario es obligatorio",
        "string.empty": "El nombre de usuario no puede estar vacío"
    }),
    email: Joi.string().email().required().messages({
        "string.email": "El email debe tener un formato válido",
        "any.required": "El email es obligatorio",
        "string.empty": "El email no puede estar vacío"
    }),
    password: Joi.string().min(6).pattern(/^(?=.*[a-zA-Z])(?=.*\d)/).required().messages({
        "string.min": "La contraseña debe tener al menos {#limit} caracteres",
        "string.pattern.base": "La contraseña debe tener al menos una letra y un número",
        "any.required": "La contraseña es obligatoria",
        "string.empty": "La contraseña no puede estar vacía"
    })
});

export const loginSchema = Joi.object({
    nombreUsuario: Joi.string().required().messages({
        "any.required": "El nombre de usuario es obligatorio",
        "string.empty": "El nombre de usuario no puede estar vacío"
    }),
    password: Joi.string().required().messages({
        "any.required": "La contraseña es obligatoria",
        "string.empty": "La contraseña no puede estar vacía"
    })
});
