/**
 * --- Regex documentadas, pensadas para explicarse en la defensa ---
 * Separadas de la ejecución de Tesseract para poder testear el parseo
 * de forma aislada, sin depender de correr OCR real.
 */

/**
 * Busca un monto: prioriza el patrón "Total" o "Monto" seguido de números,
 * porque es más confiable que buscar cualquier número suelto en el ticket
 * (que también tiene RUT, fecha, cantidad de items, etc).
 * Ejemplo que matchea: "TOTAL: $ 1.250,00" -> captura "1.250,00"
 */
// El grupo (?:U\$S|USD|\$)? cubre las tres formas en que aparece la moneda
// antes del número en un ticket uruguayo: "U$S 450", "USD 450" o "$ 450".
// Sin este grupo, "U$S" no matchea porque no es un "$" suelto.
const REGEX_MONTO_CON_ETIQUETA = /(?:total|monto|importe)\s*:?\s*(?:U\$S|USD|\$)?\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i;

/** Fallback: cualquier número con marca de moneda delante, si no encontramos la etiqueta. */
const REGEX_MONTO_GENERICO = /(?:U\$S|USD|\$)\s*([\d]{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)/i;

/**
 * Busca una fecha en formato DD/MM/YYYY, DD-MM-YYYY o DD/MM/YY (típico de
 * tickets uruguayos). Captura día, mes y año por separado para poder
 * normalizarlos a ISO después.
 */
const REGEX_FECHA = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/;

/**
 * Detecta la moneda por palabras clave. En Uruguay, "$" solo significa
 * pesos uruguayos; "U$S" o "USD" indica dólares. Buscamos la marca de
 * dólar ANTES de asumir pesos, porque "U$S" contiene un "$".
 */
const detectarMoneda = (texto) => {
    if (/U\$S|USD|d[oó]lares/i.test(texto)) return "USD";
    return "UYU";
};

/** Convierte "1.250,00" (formato uruguayo) a número JS: 1250.00 */
const parsearMontoUruguayo = (textoMonto) => {
    const normalizado = textoMonto.replace(/\./g, "").replace(",", ".");
    return parseFloat(normalizado);
};

/** Normaliza DD/MM/YYYY a YYYY-MM-DD. Asume años de 2 dígitos como 20XX. */
const normalizarFecha = (dia, mes, anio) => {
    const anioCompleto = anio.length === 2 ? `20${anio}` : anio;
    return `${anioCompleto}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
};

/**
 * Punto de entrada: recibe el texto crudo que devolvió Tesseract y trata
 * de encontrar monto, moneda y fecha. Lanza error si no hay monto —
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

    const matchFecha = textoCrudo.match(REGEX_FECHA);
    const fecha = matchFecha ? normalizarFecha(matchFecha[1], matchFecha[2], matchFecha[3]) : null;

    return { monto, moneda, fecha };
};
