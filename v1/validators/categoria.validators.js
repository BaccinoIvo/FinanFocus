import Joi from "joi";

export const crearCategoriaSchema = Joi.object({
    nombre: Joi.string().min(2).max(40).required().messages({
        "string.min": "El nombre debe tener al menos {#limit} caracteres",
        "string.max": "El nombre no puede tener más de {#limit} caracteres",
        "any.required": "El nombre es obligatorio",
        "string.empty": "El nombre no puede estar vacío"
    }),
    tipo: Joi.string().valid("ingreso", "egreso").required().messages({
        "any.only": "El tipo debe ser 'ingreso' o 'egreso'",
        "any.required": "El tipo es obligatorio"
    })
});

export const actualizarCategoriaSchema = Joi.object({
    nombre: Joi.string().min(2).max(40).messages({
        "string.min": "El nombre debe tener al menos {#limit} caracteres",
        "string.max": "El nombre no puede tener más de {#limit} caracteres",
        "string.empty": "El nombre no puede estar vacío"
    }),
    tipo: Joi.string().valid("ingreso", "egreso").messages({
        "any.only": "El tipo debe ser 'ingreso' o 'egreso'"
    })
}).min(1).messages({
    "object.min": "Debe enviar al menos un campo para actualizar"
});
