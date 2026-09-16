import mongoose from "mongoose";

const movimientoSchema = new mongoose.Schema({
    usuario: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true
    },
    categoria: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Categoria",
        required: true
    },
    tipo: {
        type: String,
        enum: ["ingreso", "egreso"],
        required: true
    },
    monto: {
        type: Number,
        required: true,
        min: 0
    },
    moneda: {
        type: String,
        enum: ["UYU", "USD", "EUR", "BRL", "ARS", "UI", "UR"],
        required: true
    },
    // Monto convertido a pesos uruguayos usando la cotización del día.
    // Se completa más adelante, cuando integremos el servicio de cotizaciones.
    montoConvertidoUYU: {
        type: Number,
        default: null
    },
    // Marca si el ingreso proviene de exportación de servicios (IVA tasa 0%).
    esExportacionServicio: {
        type: Boolean,
        default: false
    },
    fecha: {
        type: Date,
        required: true
    },
    descripcion: {
        type: String,
        trim: true,
        default: ""
    },
    // URLs de los comprobantes subidos a Cloudinary. Se completa más adelante.
    comprobantes: {
        type: [String],
        default: []
    }
}, {
    timestamps: true
});

const Movimiento = mongoose.model("Movimiento", movimientoSchema);

export default Movimiento;
