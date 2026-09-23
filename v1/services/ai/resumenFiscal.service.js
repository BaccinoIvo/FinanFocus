import { calcularEstadoFiscal } from "../estadoFiscal.service.js";
import { generarNarracion as generarConGroq } from "./groq.provider.js";
import { generarNarracion as generarConGemini } from "./gemini.provider.js";

/**
 * Endpoint no-chat: calcula el estado fiscal (reglas fijas) e intenta
 * narrarlo con IA en cadena: primero Groq (más rápido), si falla prueba
 * Gemini, y si los dos fallan devuelve los datos crudos sin narración.
 * Nunca rompe la respuesta al usuario, sin importar cuántos proveedores caigan.
 */
export const obtenerResumenFiscal = async (usuarioId) => {
    const estado = await calcularEstadoFiscal(usuarioId);

    try {
        const resumenNarrado = await generarConGroq(estado);
        return { estado, resumenNarrado, fuente: "groq" };
    } catch (errorGroq) {
        console.error("Groq no disponible, probando con Gemini ->", errorGroq.message);
    }

    try {
        const resumenNarrado = await generarConGemini(estado);
        return { estado, resumenNarrado, fuente: "gemini" };
    } catch (errorGemini) {
        console.error("Fallback final activado: ni Groq ni Gemini respondieron ->", errorGemini.message);
    }

    return { estado, resumenNarrado: null, fuente: "reglas" };
};
