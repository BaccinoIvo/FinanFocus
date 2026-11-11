import { subirImagenBuffer } from "../services/cloudinary.service.js";
import { procesarComprobante } from "../services/comprobante.service.js";


export const extraerComprobante = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No se recibió ningún archivo" });
        }

        // La subida a Cloudinary y la lectura con IA corren en paralelo: la IA ya no espera a la subida.
        const subida = subirImagenBuffer(req.file.buffer);
        subida.catch(() => {}); // si falla, el error se maneja al esperarla más abajo
        const resultado = await procesarComprobante({
            buffer: req.file.buffer,
            mimeType: req.file.mimetype,
            urlPromise: subida
        });
        const fileUrl = await subida;

        res.status(201).json({
            success: true,
            ai_processed: resultado.aiProcessed,
            fuente: resultado.fuente,
            imageUrl: fileUrl,
            datosExtraidos: resultado.datos
        });
    } catch (error) {
        next(error);
    }
};
