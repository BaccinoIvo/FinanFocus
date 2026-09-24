
const REGEX_MONTO_CON_ETIQUETA = /(?:total|monto|importe)\s*:?\s*(?:U\$S|USD|\$)?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i;
const REGEX_MONTO_GENERICO = /(?:U\$S|USD|\$)\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i;
const REGEX_FECHA = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;

const detectarMoneda = (texto) => {
    if (/U\$S|USD|d[oó]lares/i.test(texto)) return "USD";
    return "UYU";
};


const REGEX_INDICADORES_INGRESO = /recib[íi]\s+de|cobrad[oa]\s+a|factura\s+emitida|recibo\s+de\s+cobro/i;

const detectarTipo = (texto) => {
    return REGEX_INDICADORES_INGRESO.test(texto) ? "ingreso" : "egreso";
};

const parsearMontoUruguayo = (textoMonto) => {
    const normalizado = textoMonto.replace(/\./g, "").replace(",", ".");
    return parseFloat(normalizado);
};

const normalizarFecha = (dia, mes, anio) => {
    const anioCompleto = anio.length === 2 ? `20${anio}` : anio;
    return `${anioCompleto}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
};

/**
 * Punto de entrada: recibe el texto crudo que devolvió Tesseract y trata
 * de encontrar monto, moneda, fecha y tipo. Lanza error si no hay monto —
 * sin monto no hay datos útiles que ofrecer.
 */
export const parsearTextoComprobante = (textoCrudo) => {
    const matchMonto = textoCrudo.match(REGEX_MONTO_CON_ETIQUETA) || textoCrudo.match(REGEX_MONTO_GENERICO);
    if (!matchMonto) {
        throw new Error("No se encontró un monto reconocible en el texto");
    }

    const monto = parsearMontoUruguayo(matchMonto[1]);
    if (isNaN(monto)) {
        throw new Error("El monto extraído no es un número válido");
    }

    const moneda = detectarMoneda(textoCrudo);
    const tipo = detectarTipo(textoCrudo);

    const matchFecha = textoCrudo.match(REGEX_FECHA);
    const fecha = matchFecha ? normalizarFecha(matchFecha[1], matchFecha[2], matchFecha[3]) : null;

    return { monto, moneda, fecha, tipo };
};
