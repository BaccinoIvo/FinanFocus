import Categoria from "../models/categoria.model.js";
import Movimiento from "../models/movimiento.model.js";

/**
 * Crear categoría.
 * - Admin: crea categoría del sistema (visible para todos).
 * - Usuario: crea categoría propia.
 */
export const crearCategoria = async (req, res, next) => {
    try {
        const { nombre, tipo } = req.validatedBody;
        const esAdmin = req.user.tipo === "admin";

        const nueva = new Categoria({
            nombre,
            tipo,
            esDelSistema: esAdmin,
            createdBy: req.user.id
        });

        await nueva.save();
        res.status(201).json({ message: "Categoría creada", data: nueva });
    } catch (error) {
        // Violación del índice único (nombre + tipo + dueño repetidos)
        if (error.code === 11000) {
            return res.status(409).json({ message: "Ya existe una categoría con ese nombre y tipo" });
        }
        next(error);
    }
};


export const listarCategorias = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        const filtro = {
            $or: [
                { esDelSistema: true },
                { createdBy: req.user.id }
            ]
        };

        const [categorias, total] = await Promise.all([
            Categoria.find(filtro).skip(skip).limit(limit).sort({ createdAt: -1 }),
            Categoria.countDocuments(filtro)
        ]);

        res.json({
            data: categorias,
            paginacion: { page, limit, total, totalPaginas: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};


export const actualizarCategoria = async (req, res, next) => {
    try {
        const categoria = await Categoria.findById(req.params.id);
        if (!categoria) {
            return res.status(404).json({ message: "Categoría no encontrada" });
        }

        const esAdmin = req.user.tipo === "admin";
        const esDueño = categoria.createdBy.toString() === req.user.id;

        if (categoria.esDelSistema && !esAdmin) {
            return res.status(403).json({ message: "Solo el admin puede modificar categorías del sistema" });
        }
        if (!categoria.esDelSistema && !esDueño) {
            return res.status(403).json({ message: "No podés modificar una categoría que no es tuya" });
        }

        Object.assign(categoria, req.validatedBody);
        await categoria.save();
        res.json({ message: "Categoría actualizada", data: categoria });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: "Ya existe una categoría con ese nombre y tipo" });
        }
        next(error);
    }
};


export const eliminarCategoria = async (req, res, next) => {
    try {
        const categoria = await Categoria.findById(req.params.id);
        if (!categoria) {
            return res.status(404).json({ message: "Categoría no encontrada" });
        }

        const esAdmin = req.user.tipo === "admin";
        const esDueño = categoria.createdBy.toString() === req.user.id;

        if (categoria.esDelSistema && !esAdmin) {
            return res.status(403).json({ message: "Solo el admin puede eliminar categorías del sistema" });
        }
        if (!categoria.esDelSistema && !esDueño) {
            return res.status(403).json({ message: "No podés eliminar una categoría que no es tuya" });
        }

        // Restricción clave: no borrar si tiene movimientos asociados.
        const enUso = await Movimiento.countDocuments({ categoria: categoria._id });
        if (enUso > 0) {
            return res.status(409).json({
                message: `No se puede eliminar: la categoría tiene ${enUso} movimiento(s) asociado(s)`
            });
        }

        await categoria.deleteOne();
        res.json({ message: "Categoría eliminada" });
    } catch (error) {
        next(error);
    }
};
