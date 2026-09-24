import mongoose from "mongoose";


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
