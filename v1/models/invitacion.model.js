import mongoose from "mongoose";

// Invitación de un estudio a un cliente. El token real solo lo ve el estudio al crearla:
// en la base se guarda su hash, así que una filtración de la base no sirve para aceptarla.
const invitacionSchema = new mongoose.Schema({
    estudio: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", required: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    tokenHash: { type: String, required: true, unique: true },
    expiraEl: { type: Date, required: true },
    usadaEl: { type: Date, default: null }
}, { timestamps: true });

const Invitacion = mongoose.model("Invitacion", invitacionSchema);
export default Invitacion;
