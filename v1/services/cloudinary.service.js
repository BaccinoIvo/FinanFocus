import cloudinary from "../config/cloudinary.config.js";


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
