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
    montoConvertidoUYU: {
        type: Number,
        default: null
    },
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
    comprobantes: {
        type: [String],
        default: []
    },
    // Campos opcionales, completados por el usuario a mano o por la IA
    // cuando el comprobante los trae impresos. null si no están disponibles
    // — nunca se inventan.
    numeroComprobante: {
        type: String,
        trim: true,
        default: null
    },
    rutEmisor: {
        type: String,
        trim: true,
        default: null
    },
    montoIva: {
        type: Number,
        default: null
    }
}, {
    timestamps: true
});

const Movimiento = mongoose.model("Movimiento", movimientoSchema);

export default Movimiento;
