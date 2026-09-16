import mongoose from "mongoose";

const categoriaSchema = new mongoose.Schema({
    nombre: {
        type: String,
        required: true,
        trim: true
    },
    tipo: {
        type: String,
        enum: ["ingreso", "egreso"],
        required: true
    },
    // Si es true, es una categoría "del sistema" creada por el admin y visible para todos.
    // Si es false, es una categoría propia del usuario que la creó.
    esDelSistema: {
        type: Boolean,
        default: false
    },
    // Dueño de la categoría. En las del sistema apunta al admin; en las propias, al usuario.
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    }
}, {
    timestamps: true
});

// Un usuario no puede tener dos categorías propias con el mismo nombre y tipo.
categoriaSchema.index({ nombre: 1, tipo: 1, createdBy: 1 }, { unique: true });

const Categoria = mongoose.model("Categoria", categoriaSchema);

export default Categoria;
