import { extraerDatos as extraerConGemini } from "./ai/extraccionGemini.provider.js";
import { extraerDatos as extraerConTesseract } from "./ai/extraccionTesseract.provider.js";

/**
 * Cascada de lectura de un comprobante.
 *  - Imagen: Gemini (visión) -> Tesseract (OCR local) -> carga manual.
 *  - PDF: Gemini -> carga manual.
 * Gemini recibe el archivo directo desde la memoria. Tesseract necesita una URL, así que solo
 * entonces se espera a que termine la subida a Cloudinary (que corre en paralelo desde el inicio).
 * Con ORDEN_CASCADA=tesseract se invierte el orden de las imágenes.
 */
export const procesarComprobante = async ({ buffer, mimeType, urlPromise }) => {
    const esImagen = mimeType.startsWith("image/");
    const esPdf = mimeType === "application/pdf";

    if (!esImagen && !esPdf) {
        return { aiProcessed: false, fuente: "manual", datos: null };
    }

    const gemini = {
        fn: () => extraerConGemini({ buffer, mimeType }),
        fuente: "gemini_vision",
        nombre: esPdf ? "Gemini (documento PDF)" : "Gemini (visión)"
    };
    const tesseract = {
        fn: async () => extraerConTesseract(await urlPromise),
        fuente: "tesseract_ocr",
        nombre: "Tesseract (OCR local)"
    };

    let niveles = [gemini];
    if (esImagen) {
        niveles = process.env.ORDEN_CASCADA === "tesseract" ? [tesseract, gemini] : [gemini, tesseract];
    }

    for (const nivel of niveles) {
        try {
            const datos = await nivel.fn();
            return { aiProcessed: true, fuente: nivel.fuente, datos };
        } catch (error) {
            console.error(`${nivel.nombre} falló ->`, error.message);
        }
    }

    return { aiProcessed: false, fuente: "manual", datos: null };
};
