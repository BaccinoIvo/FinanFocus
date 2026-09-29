import mongoose from "mongoose";

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
        enum: ["plus", "premium"],
        default: "plus"
    },
    contador: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        default: null
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
