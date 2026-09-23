import { subirImagenBuffer } from "../services/cloudinary.service.js";
import { procesarComprobante } from "../services/comprobante.service.js";

/**
 * POST /v1/comprobantes/extraer
 * Sube la imagen a Cloudinary y, si es una imagen (no PDF/Word), intenta
 * extraer monto/moneda/fecha con la cascada de 3 niveles. El frontend usa
 * esta respuesta para pre-cargar el formulario de alta de movimiento.
 * Este endpoint SIEMPRE responde 200 si la subida a Cloudinary funcionó —
 * el fallo de la extracción de datos no es un error HTTP, es un resultado
 * posible (ai_processed:false).
 */
export const extraerComprobante = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No se recibió ningún archivo" });
        }

        const imageUrl = await subirImagenBuffer(req.file.buffer);

        // La cascada de extracción semántica solo aplica a imágenes.
        // Un PDF o Word no pasa por OCR de imagen: se sube igual, pero
        // se devuelve directo al Nivel 3 (el usuario carga los datos a mano).
        if (!req.file.mimetype.startsWith("image/")) {
            return res.status(201).json({
                success: true,
                ai_processed: false,
                imageUrl,
                datosExtraidos: null
            });
        }

        const resultado = await procesarComprobante(imageUrl);

        res.status(201).json({
            success: true,
            ai_processed: resultado.aiProcessed,
            fuente: resultado.fuente,
            imageUrl,
            datosExtraidos: resultado.datos
        });
    } catch (error) {
        next(error);
    }
};
