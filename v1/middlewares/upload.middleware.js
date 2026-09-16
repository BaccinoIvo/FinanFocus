import multer from "multer";

const storage = multer.memoryStorage();

// Comprobantes reales en Uruguay: e-Factura de DGI y recibos suelen venir
// en PDF; algunos también en Word. Se suman a las imágenes ya soportadas.
const TIPOS_PERMITIDOS = [
    "application/pdf",
    "application/msword", // .doc
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
];

const fileFilter = (req, file, cb) => {
    const esImagen = file.mimetype.startsWith("image/");
    const esDocumentoPermitido = TIPOS_PERMITIDOS.includes(file.mimetype);

    if (esImagen || esDocumentoPermitido) {
        cb(null, true);
    } else {
        cb(new Error("Solo se permiten imágenes, PDF o documentos Word (.doc/.docx)"), false);
    }
};

export const uploadMiddleware = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB: PDFs/Word suelen pesar más que una foto comprimida
});
