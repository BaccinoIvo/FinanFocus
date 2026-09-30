import { obtenerResumenFiscal } from "../services/ai/resumenFiscal.service.js";


export const resumenFiscal = async (req, res, next) => {
    try {
        const resultado = await obtenerResumenFiscal(req.user.id);
        res.json({ data: resultado });
    } catch (error) {
        next(error);
    }
};
