import axios from "axios";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
const TIMEOUT_MS = 20000;

const MONEDAS_VALIDAS = ["UYU", "USD", "EUR", "BRL", "ARS"];

const PROMPT_EXTRACCION = `Sos un asistente que extrae datos estructurados de comprobantes de pago
uruguayos (tickets, facturas, recibos). Analizá el documento y devolvé ÚNICAMENTE un objeto JSON,
sin texto adicional, sin markdown, sin backticks, con esta forma exacta:

{"monto": <número>, "moneda": "<UYU|USD|EUR|BRL|ARS>", "fecha": "<YYYY-MM-DD>"}

Reglas:
- "monto" es el total final pagado (no subtotales ni IVA por separado), como número sin separadores de miles.
- "moneda": si ves "$" solo, es UYU. Si ves "U$S", "USD" o "dólares", es USD. Si no podés determinarla, usá UYU.
- "fecha" en formato ISO (YYYY-MM-DD). Si no la encontrás, usá null.
- Si el documento no es un comprobante legible o no podés extraer el monto con confianza, respondé
  exactamente: {"error": "no_legible"}

Respondé solo con el JSON, nada más.`;

/**
 * Inserta una transformación de Cloudinary para pedir una versión
 * redimensionada y comprimida — SOLO tiene sentido para fotos (que pueden
 * pesar varios MB sin editar). Un PDF de comprobante ya suele ser liviano
 * y esta transformación es específica de imágenes, así que se salta.
 */
const obtenerUrlOptimizada = (imageUrl, mimeType) => {
    if (!mimeType.startsWith("image/")) return imageUrl;
    return imageUrl.replace("/upload/", "/upload/w_1200,q_auto,f_auto/");
};

/**
 * Descarga el archivo (imagen redimensionada, o PDF tal cual) y lo
 * codifica en base64 para mandarlo a Gemini como contenido multimodal.
 */
const descargarComoBase64 = async (fileUrl, mimeTypeConocido) => {
    const urlFinal = obtenerUrlOptimizada(fileUrl, mimeTypeConocido);
    const res = await axios.get(urlFinal, {
        responseType: "arraybuffer",
        timeout: TIMEOUT_MS
    });
    const mimeType = res.headers["content-type"] || mimeTypeConocido || "image/jpeg";
    const base64 = Buffer.from(res.data).toString("base64");
    return { base64, mimeType };
};

/**
 * Extrae {monto, moneda, fecha} de un comprobante (imagen o PDF) usando
 * Gemini. Lanza error si el documento no es legible, si Gemini no
 * responde, o si la respuesta no es un JSON válido — el orquestador
 * decide qué hacer con eso.
 *
 * mimeTypeOriginal es el tipo real del archivo subido (req.file.mimetype),
 * necesario para decidir si aplicar el redimensionado de imagen.
 */
export const extraerDatos = async (fileUrl, mimeTypeOriginal = "image/jpeg") => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Falta GEMINI_API_KEY en las variables de entorno");
    }

    const { base64, mimeType } = await descargarComoBase64(fileUrl, mimeTypeOriginal);

    let data;
    try {
        const res = await axios.post(
            GEMINI_URL,
            {
                contents: [{
                    parts: [
                        { inlineData: { mimeType, data: base64 } },
                        { text: PROMPT_EXTRACCION }
                    ]
                }]
            },
            {
                headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
                timeout: TIMEOUT_MS
            }
        );
        data = res.data;
    } catch (error) {
        const status = error.response?.status;
        throw new Error(`Gemini (visión) respondió ${status ?? error.code}`);
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) {
        throw new Error("Gemini no devolvió contenido");
    }

    let parsed;
    try {
        const limpio = texto.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
        parsed = JSON.parse(limpio);
    } catch {
        throw new Error("Gemini no devolvió un JSON válido");
    }

    if (parsed.error === "no_legible") {
        throw new Error("Gemini indicó que el documento no es legible");
    }
    if (typeof parsed.monto !== "number" || !MONEDAS_VALIDAS.includes(parsed.moneda)) {
        throw new Error("Gemini devolvió datos incompletos o inválidos");
    }

    return { monto: parsed.monto, moneda: parsed.moneda, fecha: parsed.fecha ?? null };
};
