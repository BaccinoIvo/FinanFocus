import axios from "axios";
import { construirPromptResumenFiscal } from "./prompt.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// llama-3.3-70b-versatile fue dado de baja por Groq el 16/8/2026.
// openai/gpt-oss-120b es el reemplazo oficial recomendado por Groq.
const MODEL = "openai/gpt-oss-120b";

const TIMEOUT_MS = 8000;

/**
 * Llama a la API de Groq (compatible con el formato de OpenAI) para narrar
 * el estado fiscal ya calculado. Lanza error si falla o no responde a
 * tiempo — el orquestador decide qué hacer con ese error.
 */
export const generarNarracion = async (estado) => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        throw new Error("Falta GROQ_API_KEY en las variables de entorno");
    }

    let data;
    try {
        const res = await axios.post(
            GROQ_URL,
            {
                model: MODEL,
                messages: [{ role: "user", content: construirPromptResumenFiscal(estado) }],
                temperature: 0.5,
                max_tokens: 600,
                reasoning_effort: "low"
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                timeout: TIMEOUT_MS
            }
        );
        data = res.data;
    } catch (error) {
        const status = error.response?.status;
        const detalle = error.response?.data ? JSON.stringify(error.response.data).slice(0, 200) : error.message;
        throw new Error(`Groq respondió ${status ?? error.code} - ${detalle}`);
    }

    const texto = data.choices?.[0]?.message?.content;
    if (!texto) {
        throw new Error("Groq no devolvió texto utilizable");
    }
    return texto.trim();
};