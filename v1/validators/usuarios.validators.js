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
