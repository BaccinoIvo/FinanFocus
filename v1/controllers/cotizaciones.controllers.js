import { obtenerTodasLasCotizaciones } from "../services/cotizaciones.service.js";


export const listarCotizaciones = async (req, res) => {
    const cotizaciones = await obtenerTodasLasCotizaciones();
    res.json({ data: cotizaciones });
};
