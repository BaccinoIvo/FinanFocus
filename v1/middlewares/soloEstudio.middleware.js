/**
 * Restringe el acceso a usuarios con tipo "estudio".
 * Debe usarse siempre después de authenticateToken, que carga req.user.
 */
export const soloEstudio = (req, res, next) => {
    if (req.user?.tipo !== "estudio") {
        return res.status(403).json({ message: "Acción permitida solo para estudios contables" });
    }
    next();
};
