import mongoose from "mongoose";
import { PLANES_VALIDOS } from "../config/planes.config.js";

const usuarioSchema = new mongoose.Schema({
    nombreUsuario: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    hashedPassword: {
        type: String,
        required: true
    },
    tipo: {
        type: String,
        enum: ["admin", "usuario", "estudio"],
        default: "usuario"
    },
    plan: {
        type: String,
        enum: PLANES_VALIDOS,
        default: "gratuito"
    },
    contador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        default: null
    },
    // Perfil creado por un estudio para cargar comprobantes de un cliente que no se registró.
    // No tiene acceso propio: no puede iniciar sesión.
    esPerfilSombra: {
        type: Boolean,
        default: false
    },
    trialExpiraEl: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const Usuario = mongoose.model("Usuario", usuarioSchema);

export default Usuario;
