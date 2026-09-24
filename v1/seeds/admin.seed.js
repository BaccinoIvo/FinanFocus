
import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Usuario from "../models/usuario.model.js";

const seedAdmin = async () => {
    await mongoose.connect(process.env.MONGO_URI);

    const yaExiste = await Usuario.findOne({ nombreUsuario: "admin" });
    if (yaExiste) {
        console.log("El usuario admin ya existe, no se crea de nuevo.");
        await mongoose.disconnect();
        return;
    }

    const hashedPassword = bcrypt.hashSync("Admin123!", Number(process.env.SALTING_ROUNDS));

    await Usuario.create({
        nombreUsuario: "admin",
        email: "admin@finanfocus.com",
        hashedPassword,
        tipo: "admin",
        plan: "premium" // el admin no gestiona planes, pero conviene que no tenga la restricción de 4
    });

    console.log("Usuario admin creado correctamente.");
    console.log("Usuario: admin | Password: Admin123!  (cambiar antes de exponer en producción)");

    await mongoose.disconnect();
};

seedAdmin().catch((err) => {
    console.error("Error al crear el admin:", err.message);
    process.exit(1);
});
