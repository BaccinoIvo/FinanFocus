import Joi from "joi";

export const crearMovimientoSchema = Joi.object({
    categoria: Joi.string().hex().length(24).required().messages({
        "string.hex": "El id de categoría no es válido",
        "string.length": "El id de categoría no es válido",
        "any.required": "La categoría es obligatoria"
    }),
    tipo: Joi.string().valid("ingreso", "egreso").required().messages({
        "any.only": "El tipo debe ser 'ingreso' o 'egreso'",
        "any.required": "El tipo es obligatorio"
    }),
    monto: Joi.number().min(0).required().messages({
        "number.min": "El monto no puede ser negativo",
        "any.required": "El monto es obligatorio"
    }),
    moneda: Joi.string().valid("UYU", "USD", "EUR", "BRL", "ARS", "UI", "UR").required().messages({
        "any.only": "La moneda debe ser una de: UYU, USD, EUR, BRL, ARS, UI, UR",
        "any.required": "La moneda es obligatoria"
    }),
    esExportacionServicio: Joi.boolean().default(false),
    fecha: Joi.date().required().messages({
        "date.base": "La fecha no es válida",
        "any.required": "La fecha es obligatoria"
    }),
    descripcion: Joi.string().allow("").max(200).messages({
        "string.max": "La descripción no puede superar los {#limit} caracteres"
    })
});

export const actualizarMovimientoSchema = Joi.object({
    categoria: Joi.string().hex().length(24).messages({
        "string.hex": "El id de categoría no es válido",
        "string.length": "El id de categoría no es válido"
    }),
    tipo: Joi.string().valid("ingreso", "egreso"),
    monto: Joi.number().min(0).messages({
        "number.min": "El monto no puede ser negativo"
    }),
    moneda: Joi.string().valid("UYU", "USD", "EUR", "BRL", "ARS", "UI", "UR"),
    esExportacionServicio: Joi.boolean(),
    fecha: Joi.date(),
    descripcion: Joi.string().allow("").max(200)
}).min(1).messages({
    "object.min": "Debe enviar al menos un campo para actualizar"
});
