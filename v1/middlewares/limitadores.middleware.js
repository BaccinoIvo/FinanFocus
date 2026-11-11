import rateLimit from "express-rate-limit";

const crear = (max, mensaje, extra = {}) => rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    message: { message: mensaje },
    standardHeaders: true,
    legacyHeaders: false,
    ...extra
});

// Frena la adivinanza de contraseñas: 10 intentos fallidos cada 15 minutos por IP (los exitosos no cuentan).
export const limitadorLogin = crear(10, "Demasiados intentos de ingreso. Probá de nuevo en unos minutos.", { skipSuccessfulRequests: true });

// Evita el alta masiva de cuentas desde una misma IP.
export const limitadorRegistro = crear(20, "Demasiados registros desde esta conexión. Probá de nuevo más tarde.");
