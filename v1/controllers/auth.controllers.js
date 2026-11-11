import jwt from "jsonwebtoken";
import { hashearPassword, verificarPassword } from "../services/password.service.js";
import Usuario from "../models/usuario.model.js";

export const login = async (req, res) => {
    const { nombreUsuario, password } = req.validatedBody;

    const userFound = await Usuario.findOne({ nombreUsuario });
    if (!userFound) {
        return res.status(401).json({ message: "Usuario y/o contraseña incorrectos" });
    }

    const { ok, nuevoHash } = await verificarPassword(password, userFound.hashedPassword);
    if (!ok) {
        return res.status(401).json({ message: "Usuario y/o contraseña incorrectos" });
    }

    // Cuenta con hash viejo (bcrypt): se pasa a Argon2id ahora que conocemos la contraseña correcta.
    if (nuevoHash) {
        await Usuario.updateOne({ _id: userFound._id }, { hashedPassword: nuevoHash });
    }

    const token = jwt.sign(
        { id: userFound._id, nombreUsuario: userFound.nombreUsuario, tipo: userFound.tipo, plan: userFound.plan },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({ message: "Login exitoso", token });
};

export const register = async (req, res) => {
    const { nombreUsuario, email, password } = req.validatedBody;

    // Duplicados: la letra exige que no haya dos usuarios con el mismo nombre de usuario
    const existente = await Usuario.findOne({ $or: [{ nombreUsuario }, { email }] });
    if (existente) {
        return res.status(409).json({ message: "El nombre de usuario o el email ya están registrados" });
    }

    const hashedPassword = await hashearPassword(password);

    const nuevoUsuario = new Usuario({
        nombreUsuario,
        email,
        hashedPassword
        // tipo y plan quedan en sus valores por defecto: "usuario" y "plus"
    });

    await nuevoUsuario.save();

    const token = jwt.sign(
        { id: nuevoUsuario._id, nombreUsuario: nuevoUsuario.nombreUsuario, tipo: nuevoUsuario.tipo, plan: nuevoUsuario.plan },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.status(201).json({ message: "Usuario registrado exitosamente", token });
};
