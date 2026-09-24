import { subirImagenBuffer } from "../services/cloudinary.service.js";
import { procesarComprobante } from "../services/comprobante.service.js";

/**
 * POST /v1/comprobantes/extraer
 * Sube el archivo a Cloudinary y, según su tipo (imagen, PDF, u otro),
 * intenta extraer monto/moneda/fecha con el motor correspondiente. El
 * frontend usa esta respuesta para pre-cargar el formulario de alta de
 * movimiento. Siempre responde 200 si la subida a Cloudinary funcionó —
 * el fallo de la extracción de datos no es un error HTTP, es un resultado
 * posible (ai_processed:false).
 */
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
