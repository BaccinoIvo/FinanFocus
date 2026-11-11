import Usuario from "../models/usuario.model.js";

/**
 * Bloquea las acciones de carga y exportación de un estudio cuya prueba gratuita venció
 * y que todavía no eligió un plan pago. Deja el middleware soloEstudio para el resto.
 */
export const estudioActivo = async (req, res, next) => {
    try {
        const estudio = await Usuario.findById(req.user.id);
        if (!estudio) {
            return res.status(404).json({ message: "Estudio no encontrado" });
        }
        const vencido = estudio.plan === "trial" && estudio.trialExpiraEl && estudio.trialExpiraEl < new Date();
        if (vencido) {
            return res.status(403).json({ message: "Tu prueba gratuita terminó. Elegí un plan para seguir cargando y exportando." });
        }
        req.estudio = estudio;
        next();
    } catch (error) {
        next(error);
    }
};
