import axios from "axios";

const MODELO_PRINCIPAL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
// Modelo alternativo opcional (GEMINI_MODELO_RESPALDO): se usa si el principal sigue caído tras reintentar.
const MODELO_RESPALDO = process.env.GEMINI_MODELO_RESPALDO || null;
const urlDe = (modelo) => `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
const TIMEOUT_MS = 20000;
const ESPERA_REINTENTO_MS = 1500;
// Errores transitorios de Google (sobrecarga, límite, caída momentánea): vale la pena reintentar.
const ES_TRANSITORIO = (status, codigo) => [429, 500, 502, 503, 504].includes(status) || ["ECONNABORTED", "ETIMEDOUT", "ECONNRESET"].includes(codigo);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const MONEDAS_VALIDAS = ["UYU", "USD", "EUR", "BRL", "ARS"];
const TIPOS_VALIDOS = ["ingreso", "egreso"];

const PROMPT_EXTRACCION = `Sos un asistente que extrae datos estructurados de comprobantes de pago
uruguayos (tickets, facturas, recibos). Analizá la imagen y devolvé ÚNICAMENTE un objeto JSON,
sin texto adicional, sin markdown, sin backticks, con esta forma exacta:

{"monto": <número>, "moneda": "<UYU|USD|EUR|BRL|ARS>", "fecha": "<YYYY-MM-DD>", "tipo": "<ingreso|egreso>", "numeroComprobante": <string o null>, "rutEmisor": <string o null>, "montoIva": <número o null>}

Reglas:
- "monto" es el total final pagado (no subtotales ni IVA por separado), como número sin separadores de miles.
- "moneda": si ves "$" solo, es UYU. Si ves "U$S", "USD" o "dólares", es USD. Si no podés determinarla, usá UYU.
- "fecha" en formato ISO (YYYY-MM-DD). Si no la encontrás, usá null.
- "tipo": "egreso" si el documento muestra que el usuario PAGÓ algo (ticket de compra, factura
  recibida de un proveedor, recibo de un servicio contratado). "ingreso" si el documento muestra
  que el usuario COBRÓ algo (una factura que el usuario emitió a un cliente, un recibo de cobro
  por un servicio que el usuario prestó). Si no podés determinarlo con confianza, usá "egreso"
  (es el caso más común en comprobantes fotografiados).
- "numeroComprobante": el número de factura, ticket o folio, si aparece impreso. Si no lo ves
  con claridad, usá null — no lo inventes.
- "rutEmisor": el RUT de quien emite el comprobante, si aparece impreso (formato típico:
  XX-XXXXXXX-XXX o similar). Si no lo ves con claridad, usá null — no lo inventes.
- "montoIva": el monto de IVA desglosado, SOLO si el documento lo muestra explícitamente como
  un renglón separado. Muchos tickets no lo desglosan — en ese caso, usá null. No calcules ni
  estimes un IVA que no esté impreso.
- Si la imagen no es un comprobante legible o no podés extraer el monto con confianza, respondé
  exactamente: {"error": "no_legible"}

Respondé solo con el JSON, nada más.`;

const obtenerUrlOptimizada = (fileUrl, mimeType) => {
    if (mimeType === "application/pdf") {
        return { url: fileUrl.replace("/upload/", "/upload/pg_1,w_1200,q_auto,f_jpg/"), mimeTypeFinal: "image/jpeg" };
    }
    if (mimeType.startsWith("image/")) {
        return { url: fileUrl.replace("/upload/", "/upload/w_1200,q_auto,f_auto/"), mimeTypeFinal: mimeType };
    }
    return { url: fileUrl, mimeTypeFinal: mimeType };
};

const descargarComoBase64 = async (fileUrl, mimeTypeOriginal) => {
    const { url, mimeTypeFinal } = obtenerUrlOptimizada(fileUrl, mimeTypeOriginal);
    const res = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: TIMEOUT_MS
    });
    const mimeType = res.headers["content-type"] || mimeTypeFinal;
    const base64 = Buffer.from(res.data).toString("base64");
    return { base64, mimeType };
};

/**
 * Extrae {monto, moneda, fecha, tipo, numeroComprobante, rutEmisor,
 * montoIva} de un comprobante (imagen o PDF) usando Gemini. Los últimos
 * tres campos quedan en null si Gemini no los encuentra con confianza —
 * nunca se inventan ni se estiman.
 */
export const extraerDatos = async (entrada, mimeTypeOriginal = "image/jpeg") => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Falta GEMINI_API_KEY en las variables de entorno");
    }

    // Si llega el archivo en memoria ({ buffer, mimeType }) se manda directo a Gemini: no hace falta
    // subirlo a Cloudinary, transformarlo y volver a bajarlo antes (eso sumaba varios segundos).
    // Si llega una URL, se descarga como antes.
    const { base64, mimeType } = typeof entrada === "string"
        ? await descargarComoBase64(entrada, mimeTypeOriginal)
        : { base64: entrada.buffer.toString("base64"), mimeType: entrada.mimeType };

    const cuerpo = {
        contents: [{
            parts: [
                { inlineData: { mimeType, data: base64 } },
                { text: PROMPT_EXTRACCION }
            ]
        }]
    };
    const config = { headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }, timeout: TIMEOUT_MS };

    // Principal (2 intentos) y, si está configurado, el modelo de respaldo (1 intento).
    const intentos = [
        { modelo: MODELO_PRINCIPAL }, { modelo: MODELO_PRINCIPAL },
        ...(MODELO_RESPALDO && MODELO_RESPALDO !== MODELO_PRINCIPAL ? [{ modelo: MODELO_RESPALDO }] : [])
    ];

    let data;
    let ultimoError;
    for (let i = 0; i < intentos.length; i++) {
        try {
            const res = await axios.post(urlDe(intentos[i].modelo), cuerpo, config);
            data = res.data;
            break;
        } catch (error) {
            const status = error.response?.status;
            ultimoError = new Error(`Gemini (visión) respondió ${status ?? error.code} con ${intentos[i].modelo}`);
            if (!ES_TRANSITORIO(status, error.code)) break; // 400/401/403/404: reintentar no sirve
            console.error(`${ultimoError.message}; ${i < intentos.length - 1 ? "reintentando" : "sin más intentos"}`);
            if (i < intentos.length - 1) await esperar(ESPERA_REINTENTO_MS);
        }
    }
    if (!data) throw ultimoError;

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

    const tipo = TIPOS_VALIDOS.includes(parsed.tipo) ? parsed.tipo : "egreso";

    return {
        monto: parsed.monto,
        moneda: parsed.moneda,
        fecha: parsed.fecha ?? null,
        tipo,
        numeroComprobante: typeof parsed.numeroComprobante === "string" ? parsed.numeroComprobante : null,
        rutEmisor: typeof parsed.rutEmisor === "string" ? parsed.rutEmisor : null,
        montoIva: typeof parsed.montoIva === "number" ? parsed.montoIva : null
    };
};
