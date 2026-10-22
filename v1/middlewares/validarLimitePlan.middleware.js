import Usuario from "../models/usuario.model.js";
import Movimiento from "../models/movimiento.model.js";
import { inicioDeMes, planDe } from "../config/planes.config.js";

/**
 * Valida el tope de carga del plan antes de crear un movimiento.
 * El plan gratuito permite 4 movimientos por mes; referido y directo no tienen tope.
 * Los estudios y el admin no tienen tope propio.
 */
export const validarLimitePlan = async (req, res, next) => {
    try {
        const usuario = await Usuario.findById(req.user.id);
        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        if (usuario.tipo !== "usuario") {
            return next();
        }

        const plan = planDe(usuario);
        if (!plan || plan.limiteMensual === null) {
            return next();
        }

        const usados = await Movimiento.countDocuments({
            usuario: usuario._id,
            createdAt: { $gte: inicioDeMes() }
        });
        if (usados >= plan.limiteMensual) {
            return res.status(403).json({
                message: `Límite alcanzado: el plan ${plan.nombre} permite hasta ${plan.limiteMensual} movimientos por mes. Cambiá de plan para agregar más.`
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};
