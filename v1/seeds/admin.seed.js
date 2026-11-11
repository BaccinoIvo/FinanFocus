
import "dotenv/config";
import mongoose from "mongoose";
import Usuario from "../models/usuario.model.js";
import { hashearPassword } from "../services/password.service.js";

const seedAdmin = async () => {
    await mongoose.connect(process.env.MONGO_URI);

    const yaExiste = await Usuario.findOne({ nombreUsuario: "admin" });
    if (yaExiste) {
        
        await mongoose.disconnect();
        return;
    }

    const hashedPassword = await hashearPassword("Admin123!");

    await Usuario.create({
        nombreUsuario: "admin",
        email: "admin@finanfocus.com",
        hashedPassword,
        tipo: "admin",
        plan: "directo" // el admin no gestiona planes; "directo" no tiene tope de movimientos
    });

    
    await mongoose.disconnect();
};

seedAdmin().catch((err) => {
    console.error("Error al crear el admin:", err.message);
    process.exit(1);
});
