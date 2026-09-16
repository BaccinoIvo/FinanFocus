import { obtenerTodasLasCotizaciones } from "../services/cotizaciones.service.js";

/**
 * GET /v1/cotizaciones
 * Recurso de terceros pertinente al dominio, pedido explícitamente por la letra.
 * Nunca devuelve 500 aunque el proveedor esté caído: cada moneda se resuelve
 * de forma independiente y las que fallan se marcan como no disponibles.
 */
export const listarCotizaciones = async (req, res) => {
    const cotizaciones = await obtenerTodasLasCotizaciones();
    res.json({ data: cotizaciones });
};
