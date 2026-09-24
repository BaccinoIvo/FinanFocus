import { extraerDatos as extraerConGemini } from "./ai/extraccionGemini.provider.js";
import { extraerDatos as extraerConTesseract } from "./ai/extraccionTesseract.provider.js";


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
