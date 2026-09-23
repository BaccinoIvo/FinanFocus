/**
 * Este archivo NO se importa desde el resto de la app — se lanza como un
 * proceso Node completamente aparte (ver extraccionTesseract.provider.js,
 * que lo arranca con child_process.fork()).
 *
 * Por qué: Tesseract.js tiene un defecto documentado en Node.js
 * (github.com/naptha/tesseract.js issue #367, sin resolver desde 2019)
 * donde ciertos errores del worker interno NO son atrapables con
 * try/catch — se escapan como excepción no manejada y matan el proceso
 * completo. Lo confirmamos en la práctica.
 *
 * Al correr esto en su propio proceso, si crashea, se muere solo ESTE
 * proceso — el servidor Express que atiende al resto de los usuarios
 * nunca se entera y sigue funcionando con normalidad.
 */
import { createWorker } from "tesseract.js";
import { parsearTextoComprobante } from "./parseComprobanteTexto.js";

// En Node.js (a diferencia del navegador), workerPath y corePath deben
// dejarse SIN configurar: se resuelven localmente desde node_modules.
// Solo langPath acepta una URL, porque se descarga con un fetch normal,
// no a través del mecanismo de Workers de Node.
const TESSERACT_CONFIG = {
    langPath: "https://tessdata.projectnaptha.com/4.0.0"
};

process.on("message", async (imageUrl) => {
    try {
        const worker = await createWorker("spa", 1, TESSERACT_CONFIG);

        let textoCrudo;
        try {
            const { data } = await worker.recognize(imageUrl);
            textoCrudo = data.text;
        } finally {
            await worker.terminate();
        }

        const datos = parsearTextoComprobante(textoCrudo);
        process.send({ ok: true, datos });
    } catch (error) {
        process.send({ ok: false, error: error.message });
    }
    process.exit(0); // proceso de un solo uso: se lanza, procesa, termina
});
