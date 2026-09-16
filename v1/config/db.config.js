import mongoose from "mongoose";

/**
 * Conecta a MongoDB. Seguro de llamar varias veces: si ya hay una conexión
 * activa o en curso (común en Vercel, donde una instancia "caliente" reutiliza
 * el proceso entre invocaciones), no vuelve a conectar.
 *
 * No usa process.exit() ante un error: en un entorno serverless, eso mataría
 * el proceso completo de la función. Preferimos lanzar el error y que quien
 * llama decida qué hacer (en local, server.js lo deja explotar al arrancar;
 * en Vercel, Express respondería 500 en vez de tirar abajo la función).
 */
export const connectDB = async () => {
    // 1 = connected, 2 = connecting: en ambos casos no hace falta reconectar.
    if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
        return;
    }

    const uri = process.env.MONGO_URI;
    if (!uri) {
        throw new Error("Falta la variable de entorno MONGO_URI");
    }

    await mongoose.connect(uri);
    console.log("Conectado a MongoDB correctamente");
};
