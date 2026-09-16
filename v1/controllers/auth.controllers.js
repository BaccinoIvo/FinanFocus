import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model.js";

export const login = async (req, res) => {
    const { nombreUsuario, password } = req.validatedBody;

    const userFound = await Usuario.findOne({ nombreUsuario });
    if (!userFound) {
        return res.status(401).json({ message: "Usuario y/o contraseña incorrectos" });
    }

    const valid = bcrypt.compareSync(password, userFound.hashedPassword);
    if (!valid) {
        return res.status(401).json({ message: "Usuario y/o contraseña incorrectos" });
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

    const hashedPassword = bcrypt.hashSync(password, Number(process.env.SALTING_ROUNDS));

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
