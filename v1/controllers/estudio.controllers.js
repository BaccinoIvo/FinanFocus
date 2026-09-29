import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model.js";
import Movimiento from "../models/movimiento.model.js";

const DIAS_TRIAL = 30;

export const crearEstudio = async (req, res, next) => {
    try {
        const { nombreUsuario, email, password } = req.validatedBody;

        const existente = await Usuario.findOne({ $or: [{ nombreUsuario }, { email }] });
        if (existente) {
            return res.status(409).json({ message: "El nombre de usuario o el email ya están registrados" });
        }

        const hashedPassword = bcrypt.hashSync(password, Number(process.env.SALTING_ROUNDS));
        const trialExpiraEl = new Date(Date.now() + DIAS_TRIAL * 24 * 60 * 60 * 1000);

        const nuevoEstudio = await Usuario.create({
            nombreUsuario,
            email,
            hashedPassword,
            tipo: "estudio",
            trialExpiraEl
        });

        res.status(201).json({
            message: "Estudio creado con período de prueba de 30 días",
            data: {
                _id: nuevoEstudio._id,
                nombreUsuario: nuevoEstudio.nombreUsuario,
                trialExpiraEl: nuevoEstudio.trialExpiraEl
            }
        });
    } catch (error) {
        next(error);
    }
};

export const listarMisUsuarios = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        const filtro = { contador: req.user.id };

        const [usuarios, total] = await Promise.all([
            Usuario.find(filtro).select("nombreUsuario email plan createdAt").skip(skip).limit(limit),
            Usuario.countDocuments(filtro)
        ]);

        res.json({
            data: usuarios,
            paginacion: { page, limit, total, totalPaginas: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};

export const agregarUsuario = async (req, res, next) => {
    try {
        const { nombreUsuario } = req.params;

        const usuario = await Usuario.findOne({ nombreUsuario });
        if (!usuario) {
            return res.status(404).json({ message: "No existe ningún usuario con ese nombreUsuario" });
        }
        if (usuario.tipo !== "usuario") {
            return res.status(400).json({ message: "Solo se pueden vincular usuarios de tipo 'usuario'" });
        }

        usuario.contador = req.user.id;
        await usuario.save();

        res.json({
            message: "Usuario vinculado correctamente",
            data: { nombreUsuario: usuario.nombreUsuario }
        });
    } catch (error) {
        next(error);
    }
};

const validarPertenencia = async (usuarioId, estudioId) => {
    const usuario = await Usuario.findById(usuarioId);
    if (!usuario) return { error: 404, mensaje: "Usuario no encontrado" };
    if (!usuario.contador || usuario.contador.toString() !== estudioId) {
        return { error: 403, mensaje: "Ese usuario no está vinculado a tu estudio" };
    }
    return { usuario };
};

export const verMovimientosDeUsuario = async (req, res, next) => {
    try {
        const { usuarioId } = req.params;
        const chequeo = await validarPertenencia(usuarioId, req.user.id);
        if (chequeo.error) {
            return res.status(chequeo.error).json({ message: chequeo.mensaje });
        }

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        const filtro = { usuario: usuarioId };
        const [movimientos, total] = await Promise.all([
            Movimiento.find(filtro).populate("categoria", "nombre tipo").skip(skip).limit(limit).sort({ fecha: -1 }),
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

const escaparCSV = (valor) => {
    const texto = String(valor ?? "");
    if (/[";\n]/.test(texto)) {
        return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
};

// Se agregaron NUMERO_COMPROBANTE, RUT_EMISOR e IVA al final. Cuando el
// dato existe (cargado a mano o leído por la IA), se usa el real; si no,
// queda vacío — nunca un valor inventado tipo "9.9.9.99" o "0000".
const COLUMNAS = [
    "FECHA", "TIPO", "CATEGORIA", "DESCRIPCION", "MONEDA", "MONTO_ORIGEN",
    "MONTO_UYU", "EXPORTACION_SERVICIO", "NUMERO_COMPROBANTE", "RUT_EMISOR", "IVA"
];

const mapearFila = (mov) => [
    mov.fecha.toISOString().split("T")[0],
    mov.tipo,
    mov.categoria?.nombre || "Sin categoría",
    mov.descripcion || "",
    mov.moneda,
    mov.monto,
    mov.montoConvertidoUYU ?? "",
    mov.esExportacionServicio ? "SI" : "NO",
    mov.numeroComprobante ?? "",
    mov.rutEmisor ?? "",
    mov.montoIva ?? ""
];

export const exportarMovimientos = async (req, res, next) => {
    try {
        const { usuarioId } = req.params;
        const { formato } = req.query;

        if (!formato || !["zeta", "memory"].includes(formato.toLowerCase())) {
            return res.status(400).json({ message: "El parámetro formato debe ser 'zeta' o 'memory'" });
        }

        const chequeo = await validarPertenencia(usuarioId, req.user.id);
        if (chequeo.error) {
            return res.status(chequeo.error).json({ message: chequeo.mensaje });
        }

        const movimientos = await Movimiento.find({ usuario: usuarioId }).populate("categoria", "nombre");
        if (!movimientos.length) {
            return res.status(404).json({ message: "No hay movimientos para exportar" });
        }

        const filas = movimientos.map(mapearFila);

        if (formato.toLowerCase() === "zeta") {
            const csv = [COLUMNAS.join(";"), ...filas.map(f => f.map(escaparCSV).join(";"))].join("\n");
            res.header("Content-Type", "text/csv");
            res.attachment(`Exportacion_ZetaSoftware_${usuarioId}.csv`);
            return res.status(200).send(csv);
        }

        const txt = [COLUMNAS.join("\t"), ...filas.map(f => f.join("\t"))].join("\n");
        res.header("Content-Type", "text/plain");
        res.attachment(`Exportacion_MemoryConty_${usuarioId}.txt`);
        return res.status(200).send(txt);
    } catch (error) {
        next(error);
    }
};
