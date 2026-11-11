// Revisa al arrancar que estén las variables imprescindibles: si falta una, el error dice cuál
// (en vez de fallar más tarde con un mensaje confuso en medio de una petición).
const OBLIGATORIAS = ["MONGO_URI", "JWT_SECRET"];

export const validarEntorno = () => {
    const faltan = OBLIGATORIAS.filter((nombre) => !process.env[nombre]);
    if (faltan.length) {
        throw new Error(`Faltan variables de entorno obligatorias: ${faltan.join(", ")}`);
    }
    if (process.env.JWT_SECRET.length < 16) {
        console.warn("JWT_SECRET es muy corta: usá una cadena larga y aleatoria.");
    }
    if (!process.env.GEMINI_API_KEY && !process.env.GROQ_API_KEY) {
        console.warn("Sin GEMINI_API_KEY ni GROQ_API_KEY: la lectura de comprobantes con IA caerá al ingreso manual.");
    }
};
