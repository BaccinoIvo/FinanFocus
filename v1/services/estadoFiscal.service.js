import Movimiento from "../models/movimiento.model.js";

/**
 * Calcula el estado fiscal del usuario con reglas fijas y determinísticas.
 * Esto es lo que la letra llama "el dueño del sistema": la IA nunca decide
 * estos números, solo los narra después.
 */
export const calcularEstadoFiscal = async (usuarioId) => {
    const movimientos = await Movimiento.find({ usuario: usuarioId }).populate("categoria", "nombre tipo");

    const totalIngresosUYU = movimientos
        .filter(m => m.tipo === "ingreso")
        .reduce((acc, m) => acc + (m.montoConvertidoUYU ?? (m.moneda === "UYU" ? m.monto : 0)), 0);

    const totalEgresosUYU = movimientos
        .filter(m => m.tipo === "egreso")
        .reduce((acc, m) => acc + (m.montoConvertidoUYU ?? (m.moneda === "UYU" ? m.monto : 0)), 0);

    const cantidadExportacionServicio = movimientos.filter(m => m.esExportacionServicio).length;

    // Egresos agrupados por categoría, para detectar dónde se concentra el gasto.
    const egresosPorCategoria = {};
    movimientos
        .filter(m => m.tipo === "egreso")
        .forEach(m => {
            const nombre = m.categoria?.nombre || "Sin categoría";
            const monto = m.montoConvertidoUYU ?? (m.moneda === "UYU" ? m.monto : 0);
            egresosPorCategoria[nombre] = (egresosPorCategoria[nombre] || 0) + monto;
        });

    return {
        cantidadMovimientos: movimientos.length,
        totalIngresosUYU: Number(totalIngresosUYU.toFixed(2)),
        totalEgresosUYU: Number(totalEgresosUYU.toFixed(2)),
        saldoUYU: Number((totalIngresosUYU - totalEgresosUYU).toFixed(2)),
        cantidadExportacionServicio,
        egresosPorCategoria
    };
};
