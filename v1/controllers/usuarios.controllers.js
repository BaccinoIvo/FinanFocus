import crypto from "crypto";
import jwt from "jsonwebtoken";
import Usuario from "../models/usuario.model.js";
import Movimiento from "../models/movimiento.model.js";
import Invitacion from "../models/invitacion.model.js";
import {
    PLANES_USUARIO, PLANES_ESTUDIO, inicioDeMes, normalizarPlan, planDe
} from "../config/planes.config.js";

const firmar = (u) => jwt.sign(
    { id: u._id, nombreUsuario: u.nombreUsuario, tipo: u.tipo, plan: normalizarPlan(u.plan) },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
);

const contarClientes = (estudioId) => Usuario.countDocuments({ contador: estudioId });

/** Catálogo de planes que corresponde al tipo de cuenta del usuario logueado. */
export const listarPlanes = (req, res) => {
    const catalogo = req.user.tipo === "estudio" ? PLANES_ESTUDIO : PLANES_USUARIO;
    res.json({ data: Object.values(catalogo) });
};

/**
 * Informe de uso. Usuario: movimientos del mes sobre el tope del plan (porcentaje si hay tope).
 * Estudio: clientes vinculados sobre la capacidad del plan y días de prueba que quedan.
 */
export const obtenerUso = async (req, res, next) => {
    try {
        const usuario = await Usuario.findById(req.user.id).populate("contador", "nombreUsuario");
        if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
        const plan = planDe(usuario) ?? PLANES_USUARIO.gratuito;

        if (usuario.tipo === "estudio") {
            const clientes = await contarClientes(usuario._id);
            const diasRestantes = usuario.plan === "trial" && usuario.trialExpiraEl
                ? Math.max(Math.ceil((usuario.trialExpiraEl - Date.now()) / 86400000), 0)
                : null;
            return res.json({
                data: {
                    tipo: "estudio", plan: plan.id, planNombre: plan.nombre, precioUSD: plan.precioUSD,
                    clientes, limiteClientes: plan.clientes, limiteUsuarios: plan.usuarios,
                    trialExpiraEl: usuario.trialExpiraEl, diasRestantes
                }
            });
        }

        const usados = await Movimiento.countDocuments({ usuario: usuario._id, createdAt: { $gte: inicioDeMes() } });
        const total = await Movimiento.countDocuments({ usuario: usuario._id });
        res.json({
            data: {
                tipo: usuario.tipo, plan: plan.id, planNombre: plan.nombre, precioUSD: plan.precioUSD,
                usados, total, limite: plan.limiteMensual,
                porcentaje: plan.limiteMensual ? Math.min(Math.round((usados / plan.limiteMensual) * 100), 100) : null,
                contador: usuario.contador ? { nombreUsuario: usuario.contador.nombreUsuario } : null
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cambio de plan. Usuario: gratuito <-> directo (el referido solo se activa vinculándose a un contador).
 * Estudio: independiente, boutique o escala (verifica que los clientes actuales entren en el plan nuevo).
 * Devuelve un token nuevo con el plan actualizado.
 */
export const cambiarPlan = async (req, res, next) => {
    try {
        const nuevo = req.validatedBody.plan;
        const usuario = await Usuario.findById(req.user.id);
        if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });

        if (usuario.tipo === "estudio") {
            const destino = PLANES_ESTUDIO[nuevo];
            if (!destino || nuevo === "trial") {
                return res.status(400).json({ message: "Plan no válido: elegí independiente, boutique o escala" });
            }
            if (usuario.plan === nuevo) return res.status(400).json({ message: `Ya estás en el plan ${destino.nombre}` });
            const clientes = await contarClientes(usuario._id);
            if (destino.clientes !== null && clientes > destino.clientes) {
                return res.status(409).json({ message: `Tenés ${clientes} clientes y el plan ${destino.nombre} admite ${destino.clientes}. Elegí un plan mayor.` });
            }
            usuario.plan = nuevo;
            usuario.trialExpiraEl = null;
        } else {
            if (nuevo === "referido") {
                return res.status(400).json({ message: "El plan Referido Seguro se activa al vincularte con un contador afiliado" });
            }
            if (!["gratuito", "directo"].includes(nuevo)) {
                return res.status(400).json({ message: "Plan no válido: elegí gratuito o directo" });
            }
            if (normalizarPlan(usuario.plan) === nuevo) {
                return res.status(400).json({ message: `Ya estás en el plan ${PLANES_USUARIO[nuevo].nombre}` });
            }
            if (nuevo === "gratuito" && usuario.contador) {
                return res.status(400).json({ message: "Estás vinculado a un contador: desvinculate primero para volver al plan gratuito" });
            }
            usuario.plan = nuevo;
        }

        await usuario.save();
        res.json({ message: "Plan actualizado", data: { plan: normalizarPlan(usuario.plan) }, token: firmar(usuario) });
    } catch (error) {
        next(error);
    }
};

const hashDe = (token) => crypto.createHash("sha256").update(token).digest("hex");

/** El cliente acepta la invitación de un estudio con el token que le compartieron. */
export const aceptarInvitacion = async (req, res, next) => {
    try {
        const usuario = await Usuario.findById(req.user.id);
        if (!usuario || usuario.tipo !== "usuario") {
            return res.status(403).json({ message: "Solo una cuenta de usuario puede aceptar una invitación" });
        }
        const invitacion = await Invitacion.findOne({ tokenHash: hashDe(req.validatedBody.token) });
        if (!invitacion || invitacion.usadaEl || invitacion.expiraEl < new Date()) {
            return res.status(400).json({ message: "La invitación no es válida o ya venció" });
        }
        if (invitacion.email !== usuario.email) {
            return res.status(403).json({ message: "Esta invitación fue enviada a otro email" });
        }
        if (usuario.contador) {
            return res.status(409).json({ message: "Ya estás vinculado a un contador" });
        }
        const estudio = await Usuario.findById(invitacion.estudio);
        const plan = estudio && PLANES_ESTUDIO[estudio.plan];
        if (!estudio || !plan) return res.status(400).json({ message: "El estudio ya no está disponible" });
        if (plan.clientes !== null && (await contarClientes(estudio._id)) >= plan.clientes) {
            return res.status(409).json({ message: "El estudio alcanzó el máximo de clientes de su plan" });
        }

        usuario.contador = estudio._id;
        if (normalizarPlan(usuario.plan) === "gratuito") usuario.plan = "referido";
        invitacion.usadaEl = new Date();
        await Promise.all([usuario.save(), invitacion.save()]);

        res.json({ message: `Te vinculaste con ${estudio.nombreUsuario}`, data: { plan: normalizarPlan(usuario.plan) }, token: firmar(usuario) });
    } catch (error) {
        next(error);
    }
};

/** El cliente corta el vínculo con su contador. Si estaba en Referido, vuelve a Gratuito. */
export const desvincularContador = async (req, res, next) => {
    try {
        const usuario = await Usuario.findById(req.user.id);
        if (!usuario) return res.status(404).json({ message: "Usuario no encontrado" });
        if (!usuario.contador) return res.status(400).json({ message: "No estás vinculado a ningún contador" });
        usuario.contador = null;
        if (usuario.plan === "referido") usuario.plan = "gratuito";
        await usuario.save();
        res.json({ message: "Te desvinculaste de tu contador", data: { plan: normalizarPlan(usuario.plan) }, token: firmar(usuario) });
    } catch (error) {
        next(error);
    }
};
