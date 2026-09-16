import Usuario from "../models/usuario.model.js";
import Movimiento from "../models/movimiento.model.js";

// Límite de movimientos para el plan plus. Premium es ilimitado.
const LIMITE_PLUS = 4;

/**
 * Valida que un usuario en plan plus no supere el límite de movimientos permitidos.
 * Los usuarios premium no tienen restricción.
 * Se usa como middleware antes de crear un movimiento.
 */
export const validarLimitePlan = async (req, res, next) => {
    try {
        const usuario = await Usuario.findById(req.user.id);
        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        // Premium no tiene límite: sigue de largo.
        if (usuario.plan === "premium") {
            return next();
        }

        // Plus: contar cuántos movimientos tiene ya.
        const cantidad = await Movimiento.countDocuments({ usuario: usuario._id });
        if (cantidad >= LIMITE_PLUS) {
            return res.status(403).json({
                message: `Límite alcanzado: el plan plus permite hasta ${LIMITE_PLUS} movimientos. Cambiá a premium para agregar más.`
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};
