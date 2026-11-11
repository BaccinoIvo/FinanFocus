import Joi from "joi";

export const cambiarPlanSchema = Joi.object({
    plan: Joi.string().required().messages({
        "any.required": "El plan es obligatorio",
        "string.empty": "El plan es obligatorio"
    })
});

export const aceptarInvitacionSchema = Joi.object({
    token: Joi.string().hex().length(48).required().messages({
        "string.hex": "El código de invitación no es válido",
        "string.length": "El código de invitación no es válido",
        "any.required": "El código de invitación es obligatorio",
        "string.empty": "El código de invitación es obligatorio"
    })
});

export const editarPerfilSchema = Joi.object({
    nombreUsuario: Joi.string().trim().min(3).max(30).messages({
        "string.min": "El nombre de usuario debe tener al menos {#limit} caracteres",
        "string.max": "El nombre de usuario no puede tener más de {#limit} caracteres",
        "string.empty": "El nombre de usuario no puede estar vacío"
    }),
    email: Joi.string().trim().email().messages({
        "string.email": "El email debe tener un formato válido",
        "string.empty": "El email no puede estar vacío"
    })
}).min(1).messages({
    "object.min": "Debe enviar al menos un campo para actualizar"
});

export const cambiarPasswordSchema = Joi.object({
    passwordActual: Joi.string().required().messages({
        "any.required": "La contraseña actual es obligatoria",
        "string.empty": "La contraseña actual es obligatoria"
    }),
    passwordNueva: Joi.string().min(6).pattern(/^(?=.*[a-zA-Z])(?=.*\d)/).required().messages({
        "string.min": "La contraseña nueva debe tener al menos {#limit} caracteres",
        "string.pattern.base": "La contraseña nueva debe tener al menos una letra y un número",
        "any.required": "La contraseña nueva es obligatoria",
        "string.empty": "La contraseña nueva es obligatoria"
    })
});
