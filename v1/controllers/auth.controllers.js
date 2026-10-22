import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model.js";
import { DIAS_TRIAL, normalizarPlan } from "../config/planes.config.js";

export const login = async (req, res) => {
    const { nombreUsuario, password } = req.validatedBody;

    const userFound = await Usuario.findOne({ nombreUsuario });
    if (!userFound || userFound.esPerfilSombra) {
        return res.status(401).json({ message: "Usuario y/o contraseña incorrectos" });
    }

    const valid = bcrypt.compareSync(password, userFound.hashedPassword);
    if (!valid) {
        return res.status(401).json({ message: "Usuario y/o contraseña incorrectos" });
    }

    const token = jwt.sign(
        { id: userFound._id, nombreUsuario: userFound.nombreUsuario, tipo: userFound.tipo, plan: normalizarPlan(userFound.plan) },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.json({ message: "Login exitoso", token });
};

export const register = async (req, res) => {
    const { nombreUsuario, email, password, tipo } = req.validatedBody;

    // Duplicados: la letra exige que no haya dos usuarios con el mismo nombre de usuario
    const existente = await Usuario.findOne({ $or: [{ nombreUsuario }, { email }] });
    if (existente) {
        return res.status(409).json({ message: "El nombre de usuario o el email ya están registrados" });
    }

    const hashedPassword = bcrypt.hashSync(password, Number(process.env.SALTING_ROUNDS));

    const esEstudio = tipo === "estudio";
    const nuevoUsuario = new Usuario({
        nombreUsuario,
        email,
        hashedPassword,
        tipo,
        // Usuario: arranca en el plan gratuito. Estudio: 30 días de prueba.
        plan: esEstudio ? "trial" : "gratuito",
        trialExpiraEl: esEstudio ? new Date(Date.now() + DIAS_TRIAL * 24 * 60 * 60 * 1000) : null
    });

    await nuevoUsuario.save();

    const token = jwt.sign(
        { id: nuevoUsuario._id, nombreUsuario: nuevoUsuario.nombreUsuario, tipo: nuevoUsuario.tipo, plan: normalizarPlan(nuevoUsuario.plan) },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
    );

    res.status(201).json({ message: "Usuario registrado exitosamente", token });
};
