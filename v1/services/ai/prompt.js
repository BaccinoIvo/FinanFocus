/**
 * Prompt compartido entre proveedores de IA (Groq, Gemini). Lo aislamos acá
 * para no repetirlo: si algún día hay que ajustar el texto, se cambia en
 * un solo lugar y afecta a los dos proveedores por igual.
 */
export const construirPromptResumenFiscal = (estado) => {
    const categoriasTexto = Object.entries(estado.egresosPorCategoria)
        .map(([nombre, monto]) => `${nombre}: $${monto} UYU`)
        .join(", ") || "sin egresos registrados";

    return `Sos un asistente que redacta un resumen breve y descriptivo del estado financiero
de un freelancer uruguayo, a partir de datos YA CALCULADOS. No des consejos, no sugieras
qué hacer, no menciones estrategias de ahorro de impuestos ni asesoramiento tributario.
Solo describí los números en 2-3 oraciones, en español rioplatense, de forma clara.

Datos:
- Cantidad de movimientos registrados: ${estado.cantidadMovimientos}
- Total de ingresos: $${estado.totalIngresosUYU} UYU
- Total de egresos: $${estado.totalEgresosUYU} UYU
- Saldo: $${estado.saldoUYU} UYU
- Movimientos marcados como exportación de servicio: ${estado.cantidadExportacionServicio}
- Egresos por categoría: ${categoriasTexto}

Redactá el resumen ahora, sin encabezados ni listas, solo el párrafo.`;
};
