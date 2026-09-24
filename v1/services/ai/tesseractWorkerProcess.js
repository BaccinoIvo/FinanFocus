
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
