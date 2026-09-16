import Usuario from "../models/usuario.model.js";

/**
 * Cambio de plan plus -> premium.
 * La letra: "Cambiar de plan solamente requiere estar en el plan plus."
 */
export const cambiarPlan = async (req, res, next) => {
    try {
        const usuario = await Usuario.findById(req.user.id);
        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }

        if (usuario.plan === "premium") {
            return res.status(400).json({ message: "El usuario ya tiene plan premium" });
        }

        usuario.plan = "premium";
        await usuario.save();

        res.json({ message: "Plan actualizado a premium", data: { plan: usuario.plan } });
    } catch (error) {
        next(error);
    }
};
