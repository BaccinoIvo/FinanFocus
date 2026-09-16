import cloudinary from "../config/cloudinary.config.js";

/**
 * Sube un buffer (imagen, PDF o documento Word) a Cloudinary y devuelve la URL segura.
 * resource_type: "auto" deja que Cloudinary detecte el tipo real de archivo:
 * las imágenes y PDFs se suben como "image" (permite transformaciones/preview),
 * y los .doc/.docx se suben como "raw" (Cloudinary no los interpreta, solo los aloja).
 * Usa upload_stream porque el archivo llega en memoria (multer.memoryStorage),
 * sin pasar por el disco del servidor.
 */
export const subirImagenBuffer = (buffer, folder = "finanfocus/comprobantes") => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: "auto" },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url);
            }
        );
        stream.end(buffer);
    });
};
