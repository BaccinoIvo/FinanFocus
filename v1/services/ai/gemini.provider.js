const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent";
const TIMEOUT_MS = 8000; // si Gemini no responde en 8s, se considera caído y se usa el fallback

const construirPrompt = (estado) => {
    const categoriasTexto = Object.entries(estado.egresosPorCategoria)
        .map(([nombre, monto]) => `${nombre}: $${monto} UYU`)
        .join(", ") || "sin egresos registrados";

    return `Sos un asistente que redacta un resumen breve y descriptivo del estado financiero
de un freelancer uruguayo, a partir de datos YA CALCULADOS. No des consejos, no sugieras
qué hacer, no menciones estrategias de ahorro de impuestos ni asesoramiento tributario.
Solo describí los números en 2-3 oraciones, en español rioplatense, de forma clara.

Datos:
- Cantidad de movimientos registrados: ${estado.cantidadMovimientos}
- Total de ingresos: $${estado.totalIngresosUYU} UYU
- Total de egresos: $${estado.totalEgresosUYU} UYU
- Saldo: $${estado.saldoUYU} UYU
- Movimientos marcados como exportación de servicio: ${estado.cantidadExportacionServicio}
- Egresos por categoría: ${categoriasTexto}

Redactá el resumen ahora, sin encabezados ni listas, solo el párrafo.`;
};

/**
 * Llama a la API de Gemini para narrar el estado fiscal ya calculado.
 * Lanza error si no responde a tiempo o si la API falla — el service que
 * orquesta el fallback es quien decide qué hacer con ese error.
 */
export const generarNarracion = async (estado) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("Falta GEMINI_API_KEY en las variables de entorno");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        const res = await fetch(GEMINI_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: construirPrompt(estado) }] }]
            }),
            signal: controller.signal
        });

        if (!res.ok) {
            throw new Error(`Gemini respondió ${res.status}`);
        }

        const json = await res.json();
        const texto = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!texto) {
            throw new Error("Gemini no devolvió texto utilizable");
        }
        return texto.trim();
    } finally {
        clearTimeout(timeoutId);
    }
};
