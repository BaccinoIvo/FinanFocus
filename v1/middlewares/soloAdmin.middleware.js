/**
 * Restringe el acceso a usuarios con tipo "admin".
 * Debe usarse siempre después de authenticateToken, que carga req.user.
 */
export const soloAdmin = (req, res, next) => {
    if (req.user?.tipo !== "admin") {
        return res.status(403).json({ message: "Acción permitida solo para administradores" });
    }
    next();
};
