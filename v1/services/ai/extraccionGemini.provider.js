import axios from "axios";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
const TIMEOUT_MS = 20000;

const MONEDAS_VALIDAS = ["UYU", "USD", "EUR", "BRL", "ARS"];

const PROMPT_EXTRACCION = `Sos un asistente que extrae datos estructurados de comprobantes de pago
uruguayos (tickets, facturas, recibos). Analizá la imagen y devolvé ÚNICAMENTE un objeto JSON,
sin texto adicional, sin markdown, sin backticks, con esta forma exacta:

{"monto": <número>, "moneda": "<UYU|USD|EUR|BRL|ARS>", "fecha": "<YYYY-MM-DD>"}

Reglas:
- "monto" es el total final pagado (no subtotales ni IVA por separado), como número sin separadores de miles.
- "moneda": si ves "$" solo, es UYU. Si ves "U$S", "USD" o "dólares", es USD. Si no podés determinarla, usá UYU.
- "fecha" en formato ISO (YYYY-MM-DD). Si no la encontrás, usá null.
- Si la imagen no es un comprobante legible o no podés extraer el monto con confianza, respondé
  exactamente: {"error": "no_legible"}

Respondé solo con el JSON, nada más.`;

/**
 * Inserta una transformación de Cloudinary en la URL para pedir una versión
 * redimensionada y comprimida, en vez de la foto original.
 *
 * Por qué: una foto de celular sin editar puede pesar varios MB. Codificada
 * en base64 para mandarla a Gemini (que crece ~33% el tamaño), el payload
 * puede volverse tan grande que la llamada se cuelga hasta el timeout, sin
 * dar ningún error claro — es justo lo que estábamos viendo (ECONNABORTED).
 * 1200px de ancho es de sobra para que Gemini lea texto de un ticket.
 */
const obtenerUrlRedimensionada = (imageUrl) => {
    return imageUrl.replace("/upload/", "/upload/w_1200,q_auto,f_auto/");
};

/**
 * Descarga la imagen (ya redimensionada por Cloudinary) y la codifica en
 * base64 para mandarla a Gemini como contenido multimodal (inlineData).
 */
const descargarComoBase64 = async (imageUrl) => {
    const urlOptimizada = obtenerUrlRedimensionada(imageUrl);
    const res = await axios.get(urlOptimizada, {
        responseType: "arraybuffer",
        timeout: TIMEOUT_MS
    });
    const mimeType = res.headers["content-type"] || "image/jpeg";
    const base64 = Buffer.from(res.data).toString("base64");
    return { base64, mimeType };
};

/**
 * Extrae {monto, moneda, fecha} de la imagen de un comprobante usando Gemini.
 * Lanza error si la imagen no es legible, si Gemini no responde, o si la
 * respuesta no es un JSON válido con los campos esperados — el orquestador
 * decide qué hacer (pasar al Nivel 2).
 */
export const extraerDatos = async (imageUrl) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Falta GEMINI_API_KEY en las variables de entorno");
    }

    const { base64, mimeType } = await descargarComoBase64(imageUrl);

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
        throw new Error("Gemini indicó que la imagen no es legible");
    }
    if (typeof parsed.monto !== "number" || !MONEDAS_VALIDAS.includes(parsed.moneda)) {
        throw new Error("Gemini devolvió datos incompletos o inválidos");
    }

    return { monto: parsed.monto, moneda: parsed.moneda, fecha: parsed.fecha ?? null };
};
