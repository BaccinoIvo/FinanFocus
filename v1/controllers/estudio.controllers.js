import crypto from "crypto";
import bcrypt from "bcryptjs";
import Usuario from "../models/usuario.model.js";
import Movimiento from "../models/movimiento.model.js";
import Categoria from "../models/categoria.model.js";
import Invitacion from "../models/invitacion.model.js";
import { convertirAPesos } from "../services/cotizaciones.service.js";
import { subirImagenBuffer } from "../services/cloudinary.service.js";
import { DIAS_TRIAL, HORAS_INVITACION, PLANES_ESTUDIO } from "../config/planes.config.js";

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
            plan: "trial",
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

// Cupo de clientes del plan del estudio. Devuelve un mensaje de error o null si todavía hay lugar.
const verificarCupo = async (estudio) => {
    const plan = PLANES_ESTUDIO[estudio.plan];
    if (!plan || plan.clientes === null) return null;
    const usados = await Usuario.countDocuments({ contador: estudio._id });
    return usados >= plan.clientes
        ? `Alcanzaste el máximo de ${plan.clientes} clientes del plan ${plan.nombre}. Pasá a un plan mayor para sumar más.`
        : null;
};

export const listarMisUsuarios = async (req, res, next) => {
    try {
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.max(parseInt(req.query.limit) || 10, 1);
        const skip = (page - 1) * limit;

        const filtro = { contador: req.user.id };

        const [usuarios, total] = await Promise.all([
            Usuario.find(filtro).select("nombreUsuario email plan esPerfilSombra createdAt").skip(skip).limit(limit).lean(),
            Usuario.countDocuments(filtro)
        ]);

        // Resumen por cliente: cuántos movimientos tiene y cuántos todavía no tienen comprobante.
        const resumenes = await Movimiento.aggregate([
            { $match: { usuario: { $in: usuarios.map((u) => u._id) } } },
            { $group: {
                _id: "$usuario",
                movimientos: { $sum: 1 },
                sinComprobante: { $sum: { $cond: [{ $eq: [{ $size: "$comprobantes" }, 0] }, 1, 0] } }
            } }
        ]);
        const porUsuario = new Map(resumenes.map((r) => [r._id.toString(), r]));
        const data = usuarios.map((u) => {
            const r = porUsuario.get(u._id.toString());
            return { ...u, movimientos: r?.movimientos ?? 0, sinComprobante: r?.sinComprobante ?? 0 };
        });

        res.json({
            data,
            paginacion: { page, limit, total, totalPaginas: Math.ceil(total / limit) }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Invitación de un solo uso (válida 48 h) para que un cliente se vincule al estudio.
 * Devuelve el token una única vez: el estudio se lo comparte al cliente.
 */
export const crearInvitacion = async (req, res, next) => {
    try {
        const email = req.validatedBody.email;
        const aviso = await verificarCupo(req.estudio);
        if (aviso) return res.status(409).json({ message: aviso });

        const existente = await Usuario.findOne({ email });
        if (existente && existente.tipo !== "usuario") {
            return res.status(400).json({ message: "Ese email pertenece a una cuenta que no es de cliente" });
        }
        if (existente?.contador) {
            return res.status(409).json({ message: "Ese cliente ya está vinculado a un contador" });
        }

        const token = crypto.randomBytes(24).toString("hex");
        const invitacion = await Invitacion.create({
            estudio: req.user.id,
            email,
            tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
            expiraEl: new Date(Date.now() + HORAS_INVITACION * 60 * 60 * 1000)
        });

        res.status(201).json({
            message: "Invitación creada. Compartí el enlace con tu cliente: vence en 48 horas y se usa una sola vez.",
            data: { _id: invitacion._id, email, token, expiraEl: invitacion.expiraEl }
        });
    } catch (error) {
        next(error);
    }
};

export const listarInvitaciones = async (req, res, next) => {
    try {
        const invitaciones = await Invitacion.find({ estudio: req.user.id })
            .select("email expiraEl usadaEl createdAt").sort({ createdAt: -1 }).limit(20).lean();
        const ahora = new Date();
        const data = invitaciones.map((i) => ({
            ...i,
            estado: i.usadaEl ? "aceptada" : i.expiraEl < ahora ? "vencida" : "pendiente"
        }));
        res.json({ data });
    } catch (error) {
        next(error);
    }
};

/**
 * Perfil sombra: el estudio crea un cliente que todavía no se registró para subir y procesar
 * sus comprobantes. No tiene contraseña utilizable ni puede iniciar sesión.
 */
export const crearPerfilSombra = async (req, res, next) => {
    try {
        const aviso = await verificarCupo(req.estudio);
        if (aviso) return res.status(409).json({ message: aviso });

        const nombre = req.validatedBody.nombre;
        const base = nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "").slice(0, 18) || "cliente";
        const sufijo = crypto.randomBytes(3).toString("hex");

        const sombra = await Usuario.create({
            nombreUsuario: `${base}.${sufijo}`,
            email: `sombra.${sufijo}.${Date.now()}@sombra.finanfocus.local`,
            hashedPassword: bcrypt.hashSync(crypto.randomBytes(24).toString("hex"), Number(process.env.SALTING_ROUNDS)),
            tipo: "usuario",
            plan: "referido",
            contador: req.user.id,
            esPerfilSombra: true
        });

        res.status(201).json({
            message: "Perfil sombra creado",
            data: { _id: sombra._id, nombreUsuario: sombra.nombreUsuario, nombre, esPerfilSombra: true }
        });
    } catch (error) {
        next(error);
    }
};

/** El estudio quita a un cliente real de su cartera (los perfiles sombra no se desvinculan). */
export const quitarUsuario = async (req, res, next) => {
    try {
        const chequeo = await validarPertenencia(req.params.usuarioId, req.user.id);
        if (chequeo.error) return res.status(chequeo.error).json({ message: chequeo.mensaje });
        if (chequeo.usuario.esPerfilSombra) {
            return res.status(400).json({ message: "Un perfil sombra no se puede desvincular" });
        }
        chequeo.usuario.contador = null;
        if (chequeo.usuario.plan === "referido") chequeo.usuario.plan = "gratuito";
        await chequeo.usuario.save();
        res.json({ message: "Cliente quitado de tu cartera" });
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


// ---- Carga de movimientos para perfiles sombra (solo estos: a un cliente real no se le toca la información) ----

const sombraDelEstudio = async (usuarioId, estudioId) => {
    const chequeo = await validarPertenencia(usuarioId, estudioId);
    if (chequeo.error) return chequeo;
    if (!chequeo.usuario.esPerfilSombra) {
        return { error: 403, mensaje: "Solo podés cargar movimientos en perfiles sombra. Un cliente registrado carga los suyos." };
    }
    return chequeo;
};

const categoriaUsable = async (categoriaId, estudioId, usuarioId) => {
    const categoria = await Categoria.findById(categoriaId);
    if (!categoria) return { error: 404, mensaje: "La categoría indicada no existe" };
    const duenio = categoria.createdBy.toString();
    if (!categoria.esDelSistema && duenio !== estudioId && duenio !== usuarioId) {
        return { error: 403, mensaje: "No podés usar una categoría que no es tuya" };
    }
    return { categoria };
};

export const crearMovimientoDeSombra = async (req, res, next) => {
    try {
        const { usuarioId } = req.params;
        const chequeo = await sombraDelEstudio(usuarioId, req.user.id);
        if (chequeo.error) return res.status(chequeo.error).json({ message: chequeo.mensaje });

        const datos = req.validatedBody;
        const cat = await categoriaUsable(datos.categoria, req.user.id, usuarioId);
        if (cat.error) return res.status(cat.error).json({ message: cat.mensaje });

        const montoConvertidoUYU = await convertirAPesos(datos.monto, datos.moneda);
        const movimiento = await Movimiento.create({ ...datos, montoConvertidoUYU, usuario: usuarioId });
        res.status(201).json({ message: "Movimiento creado", data: movimiento });
    } catch (error) {
        next(error);
    }
};

export const actualizarMovimientoDeSombra = async (req, res, next) => {
    try {
        const { usuarioId, id } = req.params;
        const chequeo = await sombraDelEstudio(usuarioId, req.user.id);
        if (chequeo.error) return res.status(chequeo.error).json({ message: chequeo.mensaje });

        const movimiento = await Movimiento.findOne({ _id: id, usuario: usuarioId });
        if (!movimiento) return res.status(404).json({ message: "Movimiento no encontrado" });

        if (req.validatedBody.categoria) {
            const cat = await categoriaUsable(req.validatedBody.categoria, req.user.id, usuarioId);
            if (cat.error) return res.status(cat.error).json({ message: cat.mensaje });
        }
        Object.assign(movimiento, req.validatedBody);
        if (req.validatedBody.monto !== undefined || req.validatedBody.moneda !== undefined) {
            movimiento.montoConvertidoUYU = await convertirAPesos(movimiento.monto, movimiento.moneda);
        }
        await movimiento.save();
        res.json({ message: "Movimiento actualizado", data: movimiento });
    } catch (error) {
        next(error);
    }
};

export const eliminarMovimientoDeSombra = async (req, res, next) => {
    try {
        const { usuarioId, id } = req.params;
        const chequeo = await sombraDelEstudio(usuarioId, req.user.id);
        if (chequeo.error) return res.status(chequeo.error).json({ message: chequeo.mensaje });

        const eliminado = await Movimiento.findOneAndDelete({ _id: id, usuario: usuarioId });
        if (!eliminado) return res.status(404).json({ message: "Movimiento no encontrado" });
        res.json({ message: "Movimiento eliminado" });
    } catch (error) {
        next(error);
    }
};

export const subirComprobanteDeSombra = async (req, res, next) => {
    try {
        const { usuarioId, id } = req.params;
        if (!req.file) return res.status(400).json({ message: "No se recibió ningún archivo" });
        const chequeo = await sombraDelEstudio(usuarioId, req.user.id);
        if (chequeo.error) return res.status(chequeo.error).json({ message: chequeo.mensaje });

        const movimiento = await Movimiento.findOne({ _id: id, usuario: usuarioId });
        if (!movimiento) return res.status(404).json({ message: "Movimiento no encontrado" });

        movimiento.comprobantes.push(await subirImagenBuffer(req.file.buffer));
        await movimiento.save();
        res.status(201).json({ message: "Comprobante subido", data: movimiento });
    } catch (error) {
        next(error);
    }
};
