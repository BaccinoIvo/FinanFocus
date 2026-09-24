import { extraerDatos as extraerConGemini } from "./ai/extraccionGemini.provider.js";
import { extraerDatos as extraerConTesseract } from "./ai/extraccionTesseract.provider.js";

/**
 * Cascada de extracción de datos de un comprobante. El comportamiento
 * depende del tipo de archivo:
 *
 *   - Imagen (jpg/png/etc): cascada completa.
 *       Nivel 1 — Tesseract.js (OCR local, proceso hijo aislado)
 *       Nivel 2 — Gemini (visión), respaldo si Tesseract falla
 *       Nivel 3 — manual
 *
 *   - PDF: Tesseract no está pensado para leer PDFs directamente, así que
 *     se salta. Gemini sí puede analizar PDFs como documento.
 *       Nivel 1 — Gemini (documento)
 *       Nivel 2 — manual
 *
 *   - Cualquier otro tipo (Word, etc): va directo a manual, ninguno de
 *     los dos motores está pensado para ese formato.
 *
 * ORDEN_CASCADA=normal invierte el orden Tesseract/Gemini para imágenes
 * (válvula de escape, ver extraccionTesseract.provider.js). No afecta el
 * caso PDF, que siempre usa Gemini directamente.
 */
export const procesarComprobante = async (fileUrl, mimeType) => {
    const esImagen = mimeType.startsWith("image/");
    const esPdf = mimeType === "application/pdf";

    if (!esImagen && !esPdf) {
        return { aiProcessed: false, fuente: "manual", datos: null };
    }

    if (esPdf) {
        try {
            const datos = await extraerConGemini(fileUrl, mimeType);
            return { aiProcessed: true, fuente: "gemini_vision", datos };
        } catch (error) {
            console.error("Gemini (documento PDF) falló ->", error.message);
        }
        return { aiProcessed: false, fuente: "manual", datos: null };
    }

    // A partir de acá, es imagen: cascada completa con Tesseract + Gemini.
    const ordenNormal = process.env.ORDEN_CASCADA === "normal";

    const nivelesEnOrden = ordenNormal
        ? [
            { fn: () => extraerConGemini(fileUrl, mimeType), fuente: "gemini_vision", nombre: "Gemini (visión)" },
            { fn: () => extraerConTesseract(fileUrl), fuente: "tesseract_ocr", nombre: "Tesseract (OCR local)" }
        ]
        : [
            { fn: () => extraerConTesseract(fileUrl), fuente: "tesseract_ocr", nombre: "Tesseract (OCR local)" },
            { fn: () => extraerConGemini(fileUrl, mimeType), fuente: "gemini_vision", nombre: "Gemini (visión)" }
        ];

    for (const nivel of nivelesEnOrden) {
        try {
            const datos = await nivel.fn();
            return { aiProcessed: true, fuente: nivel.fuente, datos };
        } catch (error) {
            console.error(`${nivel.nombre} falló ->`, error.message);
        }
    }

    return { aiProcessed: false, fuente: "manual", datos: null };
};
