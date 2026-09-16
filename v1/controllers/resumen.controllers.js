import { obtenerResumenFiscal } from "../services/ai/resumenFiscal.service.js";

/**
 * GET /v1/resumen-fiscal
 * Flujo de IAG no-chat pedido por la letra. Siempre responde 200: si Gemini
 * está caído, el campo "resumenNarrado" viene null y "fuente" dice "reglas",
 * pero los datos calculados siempre están.
 */
export const resumenFiscal = async (req, res, next) => {
    try {
        const resultado = await obtenerResumenFiscal(req.user.id);
        res.json({ data: resultado });
    } catch (error) {
        next(error);
    }
};
