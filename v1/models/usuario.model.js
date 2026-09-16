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
        enum: ["admin", "usuario"],
        default: "usuario"
    },
    plan: {
        type: String,
        enum: ["plus", "premium"],
        default: "plus"
    }
}, {
    timestamps: true // agrega createdAt y updatedAt automaticamente
});

const Usuario = mongoose.model("Usuario", usuarioSchema);

export default Usuario;
