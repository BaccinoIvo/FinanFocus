import Movimiento from "../models/movimiento.model.js";
import Categoria from "../models/categoria.model.js";
import { convertirAPesos } from "../services/cotizaciones.service.js";
import { subirImagenBuffer } from "../services/cloudinary.service.js";

/**
 * Crear movimiento. El límite de plan ya fue validado por el middleware previo.
 * Valida que la categoría exista y sea usable por el usuario (del sistema o propia).
 */
export const crearMovimiento = async (req, res, next) => {
    try {
        const datos = req.validatedBody;

        const categoria = await Categoria.findById(datos.categoria);
        if (!categoria) {
            return res.status(404).json({ message: "La categoría indicada no existe" });
        }
        const usable = categoria.esDelSistema || categoria.createdBy.toString() === req.user.id;
        if (!usable) {
            return res.status(403).json({ message: "No podés usar una categoría que no es tuya" });
        }

        // Pesificación automática. Si el servicio de cotizaciones falla,
        // montoConvertidoUYU queda en null y el movimiento se crea igual.
        const montoConvertidoUYU = await convertirAPesos(datos.monto, datos.moneda);

        const movimiento = new Movimiento({
            ...datos,
            montoConvertidoUYU,
            usuario: req.user.id
        });

        await movimiento.save();
        res.status(201).json({ message: "Movimiento creado", data: movimiento });
    } catch (error) {
        next(error);
    }
};

/**
 * Listar movimientos del usuario, con paginación y filtros
 * por categoría, tipo, moneda y rango de fechas.
 */
export const listarMovimientos = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        const filtro = { usuario: req.user.id };

        if (req.query.categoria) filtro.categoria = req.query.categoria;
        if (req.query.tipo) filtro.tipo = req.query.tipo;
        if (req.query.moneda) filtro.moneda = req.query.moneda;
        if (req.query.desde || req.query.hasta) {
            filtro.fecha = {};
            if (req.query.desde) filtro.fecha.$gte = new Date(req.query.desde);
            if (req.query.hasta) filtro.fecha.$lte = new Date(req.query.hasta);
        }

        const [movimientos, total] = await Promise.all([
            Movimiento.find(filtro)
                .populate("categoria", "nombre tipo")
                .skip(skip).limit(limit).sort({ fecha: -1 }),
            Movimiento.countDocuments(filtro)
        ]);

        res.json({
            data: movimientos,
            paginacion: { page, limit, total, totalPaginas: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Consultar un movimiento puntual (solo del propio usuario).
 */
export const obtenerMovimiento = async (req, res, next) => {
    try {
        const movimiento = await Movimiento.findOne({
            _id: req.params.id,
            usuario: req.user.id
        }).populate("categoria", "nombre tipo");

        if (!movimiento) {
            return res.status(404).json({ message: "Movimiento no encontrado" });
        }
        res.json({ data: movimiento });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualizar un movimiento propio.
 */
export const actualizarMovimiento = async (req, res, next) => {
    try {
        const movimiento = await Movimiento.findOne({
            _id: req.params.id,
            usuario: req.user.id
        });
        if (!movimiento) {
            return res.status(404).json({ message: "Movimiento no encontrado" });
        }

        // Si cambia la categoría, validar que exista y sea usable.
        if (req.validatedBody.categoria) {
            const categoria = await Categoria.findById(req.validatedBody.categoria);
            if (!categoria) {
                return res.status(404).json({ message: "La categoría indicada no existe" });
            }
            const usable = categoria.esDelSistema || categoria.createdBy.toString() === req.user.id;
            if (!usable) {
                return res.status(403).json({ message: "No podés usar una categoría que no es tuya" });
            }
        }

        Object.assign(movimiento, req.validatedBody);

        // Si cambió el monto o la moneda, recalcular la pesificación.
        if (req.validatedBody.monto !== undefined || req.validatedBody.moneda !== undefined) {
            movimiento.montoConvertidoUYU = await convertirAPesos(movimiento.monto, movimiento.moneda);
        }

        await movimiento.save();
        res.json({ message: "Movimiento actualizado", data: movimiento });
    } catch (error) {
        next(error);
    }
};

/**
 * Subir un comprobante (imagen) asociado a un movimiento propio.
 * El archivo llega vía multer en req.file (memoria), se sube a Cloudinary,
 * y la URL resultante se agrega al array de comprobantes del movimiento.
 */
export const subirComprobante = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No se recibió ningún archivo" });
        }

        const movimiento = await Movimiento.findOne({
            _id: req.params.id,
            usuario: req.user.id
        });
        if (!movimiento) {
            return res.status(404).json({ message: "Movimiento no encontrado" });
        }

        const url = await subirImagenBuffer(req.file.buffer);
        movimiento.comprobantes.push(url);
        await movimiento.save();

        res.status(201).json({ message: "Comprobante subido", data: movimiento });
    } catch (error) {
        next(error);
    }
};

/**
 * Eliminar un movimiento propio.
 */
export const eliminarMovimiento = async (req, res, next) => {
    try {
        const movimiento = await Movimiento.findOneAndDelete({
            _id: req.params.id,
            usuario: req.user.id
        });
        if (!movimiento) {
            return res.status(404).json({ message: "Movimiento no encontrado" });
        }
        res.json({ message: "Movimiento eliminado" });
    } catch (error) {
        next(error);
    }
};
