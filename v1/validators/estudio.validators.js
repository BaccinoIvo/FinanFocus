import Joi from "joi";

export const crearEstudioSchema = Joi.object({
    nombreUsuario: Joi.string().min(3).max(30).required().messages({
        "any.required": "El nombre de usuario es obligatorio",
        "string.empty": "El nombre de usuario no puede estar vacío"
    }),
    email: Joi.string().email().required().messages({
        "string.email": "El email debe tener un formato válido",
        "any.required": "El email es obligatorio"
    }),
    password: Joi.string().min(6).pattern(/^(?=.*[a-zA-Z])(?=.*\d)/).required().messages({
        "string.min": "La contraseña debe tener al menos {#limit} caracteres",
        "string.pattern.base": "La contraseña debe tener al menos una letra y un número",
        "any.required": "La contraseña es obligatoria"
    })
});

export const asignarContadorSchema = Joi.object({
    nombreUsuarioContador: Joi.string().required().messages({
        "any.required": "El nombre de usuario del contador es obligatorio",
        "string.empty": "El nombre de usuario del contador no puede estar vacío"
    })
});
