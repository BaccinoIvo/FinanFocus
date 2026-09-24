import axios from "axios";
import { construirPromptResumenFiscal } from "./prompt.js";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
const TIMEOUT_MS = 8000;


export const generarNarracion = async (estado) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Falta GEMINI_API_KEY en las variables de entorno");
    }

    let data;
    try {
        const res = await axios.post(
            GEMINI_URL,
            { contents: [{ parts: [{ text: construirPromptResumenFiscal(estado) }] }] },
            {
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                timeout: TIMEOUT_MS
            }
        );
        data = res.data;
    } catch (error) {
        const status = error.response?.status;
        throw new Error(`Gemini respondió ${status ?? error.code}`);
    }

    const texto = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) {
        throw new Error("Gemini no devolvió texto utilizable");
    }
    return texto.trim();
};
