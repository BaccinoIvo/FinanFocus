import { subirImagenBuffer } from "../services/cloudinary.service.js";
import { procesarComprobante } from "../services/comprobante.service.js";


export const extraerComprobante = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No se recibió ningún archivo" });
        }

        const fileUrl = await subirImagenBuffer(req.file.buffer);
        const resultado = await procesarComprobante(fileUrl, req.file.mimetype);

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
