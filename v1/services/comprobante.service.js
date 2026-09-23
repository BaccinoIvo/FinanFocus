import { extraerDatos as extraerConGemini } from "./ai/extraccionGemini.provider.js";
import { extraerDatos as extraerConTesseract } from "./ai/extraccionTesseract.provider.js";

/**
 * Cascada Invertida de extracción de datos de un comprobante:
 *   Nivel 1 — Tesseract.js (OCR local, gratis): corre aislado en un
 *             proceso hijo (ver extraccionTesseract.provider.js) para que
 *             un crash de la librería no se lleve puesto el servidor.
 *   Nivel 2 — Gemini (visión): respaldo inteligente si el Nivel 1 falla
 *             (imagen ilegible para OCR, regex sin match, etc).
 *   Nivel 3 — Degradación elegante: 200 con ai_processed:false si los dos
 *             anteriores fallan. Nunca rompe el flujo del usuario.
 *
 * ORDEN_CASCADA=normal invierte el orden a Gemini primero / Tesseract
 * segundo. Es una válvula de escape: si en el entorno real de despliegue
 * el proceso hijo de Tesseract da problemas que no se ven en desarrollo
 * local, esto permite cambiar de estrategia sin tocar código, solo la
 * variable de entorno.
 */
export const procesarComprobante = async (imageUrl) => {
    const ordenNormal = process.env.ORDEN_CASCADA === "normal";

    const nivelesEnOrden = ordenNormal
        ? [
            { fn: extraerConGemini, fuente: "gemini_vision", nombre: "Gemini (visión)" },
            { fn: extraerConTesseract, fuente: "tesseract_ocr", nombre: "Tesseract (OCR local)" }
        ]
        : [
            { fn: extraerConTesseract, fuente: "tesseract_ocr", nombre: "Tesseract (OCR local)" },
            { fn: extraerConGemini, fuente: "gemini_vision", nombre: "Gemini (visión)" }
        ];

    for (const nivel of nivelesEnOrden) {
        try {
            const datos = await nivel.fn(imageUrl);
            return { aiProcessed: true, fuente: nivel.fuente, datos };
        } catch (error) {
            console.error(`${nivel.nombre} falló ->`, error.message);
        }
    }

    return { aiProcessed: false, fuente: "manual", datos: null };
};
