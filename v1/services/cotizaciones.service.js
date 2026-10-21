import axios from "axios";

const BASE_URL = "https://datosuruguay.com/api/v1";
const TIMEOUT_MS = 8000;

// Fuente de respaldo (gratuita, sin clave): tipos de cambio internacionales de referencia.
// Se usa solo si datosuruguay.com (BROU) no responde.
const RESPALDO_URL = "https://open.er-api.com/v6/latest/USD";

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


// Devuelve la tabla de tasas USD -> X desde la fuente de respaldo (con caché propio).
const obtenerTablaRespaldo = async () => {
    const cacheada = getCache("respaldo:tabla");
    if (cacheada) return cacheada;

    const res = await axios.get(RESPALDO_URL, { timeout: TIMEOUT_MS });
    const { result, rates, time_last_update_unix } = res.data ?? {};
    if (result !== "success" || !rates?.UYU) {
        throw new Error("La fuente de respaldo no devolvió tasas válidas");
    }
    const tabla = {
        rates,
        fecha: time_last_update_unix
            ? new Date(time_last_update_unix * 1000).toISOString()
            : new Date().toISOString()
    };
    setCache("respaldo:tabla", tabla, TTL_QUOTE_MS);
    return tabla;
};

// Cotización X -> UYU calculada a partir de la tabla en dólares. No tiene compra/venta.
const obtenerCotizacionRespaldo = async (moneda) => {
    const { rates, fecha } = await obtenerTablaRespaldo();
    const m = moneda.toUpperCase();
    const tasa = m === "USD" ? 1 : rates[m];
    if (!tasa) throw new Error(`La fuente de respaldo no tiene ${m}`);
    return {
        moneda: m,
        valor: Number((rates.UYU / tasa).toFixed(m === "ARS" ? 6 : 4)),
        compra: null,
        venta: null,
        fecha,
        referencia: true
    };
};

const obtenerCotizacionPrincipal = async (moneda) => {
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


// Primero BROU (datosuruguay.com); si falla, valor de referencia internacional.
const obtenerCotizacionMoneda = async (moneda) => {
    try {
        return await obtenerCotizacionPrincipal(moneda);
    } catch (errorPrincipal) {
        console.error(`Cotización principal falló para ${moneda}: ${errorPrincipal.message}. Usando respaldo.`);
        const respaldo = await obtenerCotizacionRespaldo(moneda);
        setCache(`moneda:${moneda}`, respaldo, 60 * 1000); // reintenta la principal en 1 minuto
        return respaldo;
    }
};


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


export const obtenerCotizacion = async (moneda) => {
    const m = moneda.toUpperCase();
    if (["USD", "EUR", "BRL", "ARS"].includes(m)) return obtenerCotizacionMoneda(m);
    if (m === "UI" || m === "UR") return obtenerUnidadIndexada(m);
    throw new Error(`Moneda no soportada: ${moneda}`);
};


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
