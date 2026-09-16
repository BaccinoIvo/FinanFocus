import { calcularEstadoFiscal } from "../estadoFiscal.service.js";
import { generarNarracion } from "./gemini.provider.js";

/**
 * Endpoint no-chat: calcula el estado fiscal (reglas fijas) e intenta narrarlo
 * con IA. Si el servicio de IA falla o no responde a tiempo, devuelve los
 * datos crudos igual, sin narración — nunca rompe la respuesta al usuario.
 */
export const obtenerResumenFiscal = async (usuarioId) => {
    const estado = await calcularEstadoFiscal(usuarioId);

    try {
        const resumenNarrado = await generarNarracion(estado);
        return { estado, resumenNarrado, fuente: "ia" };
    } catch (error) {
        console.error("Fallback activado: Gemini no disponible ->", error.message);
        return { estado, resumenNarrado: null, fuente: "reglas" };
    }
};
