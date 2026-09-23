import axios from "axios";

const BASE_URL = "https://datosuruguay.com/api/v1";
const TIMEOUT_MS = 8000;

// Caché simple en memoria. datosuruguay.com cachea 5min (quotes) y 15min (series),
// y tiene límite compartido de 20 req/10s y 300 req/hora. Respetar esto con
// nuestro propio caché evita pegarle de más y hace la integración más estable.
const cache = new Map();
const TTL_QUOTE_MS = 5 * 60 * 1000;   // 5 minutos (USD, EUR, BRL, ARS: cotización de mostrador)
const TTL_SERIE_MS = 15 * 60 * 1000;  // 15 minutos (UI, UR: series diarias/mensuales)

const getCache = (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > entry.ttl) {
        cache.delete(key);
        return null;
    }
    return entry.value;
};

const setCache = (key, value, ttl) => {
    cache.set(key, { value, timestamp: Date.now(), ttl });
};

/**
 * Cotización de mostrador (compra/venta) para USD, EUR, BRL o ARS, vía BROU.
 * Devuelve el promedio (average) como valor de referencia.
 */
const obtenerCotizacionMoneda = async (moneda) => {
    const key = `moneda:${moneda}`;
    const cacheado = getCache(key);
    if (cacheado) return cacheado;

    let data;
    try {
        const res = await axios.get(`${BASE_URL}/exchange-rates/${moneda.toLowerCase()}/quote`, {
            timeout: TIMEOUT_MS
        });
        data = res.data;
    } catch (error) {
        const status = error.response?.status;
        throw new Error(`datosuruguay.com respondió ${status ?? error.code} para ${moneda}`);
    }

    if (data.error) {
        throw new Error(`datosuruguay.com: ${data.error.code}`);
    }

    const resultado = {
        moneda: moneda.toUpperCase(),
        valor: data.data.average,
        compra: data.data.buy,
        venta: data.data.sell,
        fecha: data.data.as_of
    };
    setCache(key, resultado, TTL_QUOTE_MS);
    return resultado;
};

/**
 * Valor de la Unidad Indexada (UI) o Unidad Reajustable (UR), última cotización disponible.
 */
const obtenerUnidadIndexada = async (tipo) => {
    const key = `unidad:${tipo}`;
    const cacheado = getCache(key);
    if (cacheado) return cacheado;

    let data;
    try {
        const res = await axios.get(`${BASE_URL}/indexed-units/${tipo.toLowerCase()}`, {
            params: { limit: 1 },
            timeout: TIMEOUT_MS
        });
        data = res.data;
    } catch (error) {
        const status = error.response?.status;
        throw new Error(`datosuruguay.com respondió ${status ?? error.code} para ${tipo}`);
    }

    if (data.error) {
        throw new Error(`datosuruguay.com: ${data.error.code}`);
    }
    const punto = data.data[0];
    if (!punto) {
        throw new Error(`Sin datos disponibles para ${tipo}`);
    }

    const resultado = {
        moneda: tipo.toUpperCase(),
        valor: punto.value,
        fecha: punto.date
    };
    setCache(key, resultado, TTL_SERIE_MS);
    return resultado;
};

/**
 * Devuelve { moneda, valor, fecha } para USD, EUR, BRL, ARS, UI o UR.
 */
export const obtenerCotizacion = async (moneda) => {
    const m = moneda.toUpperCase();
    if (["USD", "EUR", "BRL", "ARS"].includes(m)) return obtenerCotizacionMoneda(m);
    if (m === "UI" || m === "UR") return obtenerUnidadIndexada(m);
    throw new Error(`Moneda no soportada: ${moneda}`);
};

/**
 * Convierte un monto a pesos uruguayos según su moneda.
 * Devuelve null en vez de lanzar si el servicio de cotizaciones falla:
 * así un movimiento se puede seguir creando aunque la fuente externa esté caída.
 */
export const convertirAPesos = async (monto, moneda) => {
    if (moneda === "UYU") return monto;
    try {
        const cot = await obtenerCotizacion(moneda);
        return Number((monto * cot.valor).toFixed(2));
    } catch (error) {
        console.error(`No se pudo convertir ${moneda} a UYU:`, error.message);
        return null;
    }
};

/**
 * Snapshot de las 6 cotizaciones para el endpoint standalone GET /v1/cotizaciones.
 * Cada una se resuelve en forma independiente: si una falla, las demás igual se devuelven.
 */
export const obtenerTodasLasCotizaciones = async () => {
    const monedas = ["USD", "EUR", "BRL", "ARS", "UI", "UR"];
    const resultados = await Promise.allSettled(monedas.map(obtenerCotizacion));

    return monedas.reduce((acc, moneda, i) => {
        const r = resultados[i];
        acc[moneda] = r.status === "fulfilled"
            ? r.value
            : { moneda, error: "No disponible en este momento" };
        return acc;
    }, {});
};
