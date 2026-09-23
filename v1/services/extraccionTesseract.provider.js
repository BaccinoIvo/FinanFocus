import { fork } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKER_SCRIPT = path.join(__dirname, "tesseractWorkerProcess.js");

const TIMEOUT_MS = 15000;

/**
 * Corre Tesseract en un proceso hijo aislado. Si el hijo responde con un
 * resultado, se resuelve. Si crashea, se cuelga, o termina sin avisar, se
 * rechaza — pero el proceso PADRE (el servidor Express) nunca se ve afectado.
 *
 * NOTA: silent quedó en false (a diferencia de antes) para que el
 * stdout/stderr del hijo se vea en los logs de Vercel — necesario para
 * diagnosticar la causa exacta del crash interno de Tesseract. Una vez
 * identificada y resuelta (o aceptada como comportamiento esperado), se
 * puede volver a poner en true para logs más limpios.
 */
export const extraerDatos = (imageUrl) => {
    return new Promise((resolve, reject) => {
        const child = fork(WORKER_SCRIPT, [], { silent: false });
        let resuelto = false;

        const finalizar = (accion) => {
            if (resuelto) return;
            resuelto = true;
            clearTimeout(timeoutId);
            child.removeAllListeners();
            child.kill();
            accion();
        };

        const timeoutId = setTimeout(() => {
            finalizar(() => reject(new Error("Tesseract (proceso hijo) superó el tiempo límite")));
        }, TIMEOUT_MS);

        child.on("message", (respuesta) => {
            finalizar(() => {
                if (respuesta.ok) resolve(respuesta.datos);
                else reject(new Error(`Tesseract reportó error: ${respuesta.error}`));
            });
        });

        child.on("exit", (code) => {
            finalizar(() => reject(new Error(
                `Tesseract (proceso hijo) terminó inesperadamente (código ${code}) — probable crash interno de la librería`
            )));
        });

        child.on("error", (err) => {
            finalizar(() => reject(new Error(`No se pudo iniciar el proceso hijo de Tesseract: ${err.message}`)));
        });

        child.send(imageUrl);
    });
};
