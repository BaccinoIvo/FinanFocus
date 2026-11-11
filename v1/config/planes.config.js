// Catálogo de planes de FinanFocus (fuente única: el frontend lo pide a GET /usuarios/planes).
//
//  - Usuarios finales (B2B2C): gratuito, referido y directo.
//  - Contadores y estudios (B2B): trial, independiente, boutique y escala.
//
// limiteMensual: movimientos que se pueden cargar por mes calendario (null = sin tope).
// clientes / usuarios: capacidad de un estudio (null = ilimitado).

export const PLANES_USUARIO = {
    gratuito: {
        id: "gratuito", nombre: "Gratuito", precioUSD: 0, limiteMensual: 4,
        descripcion: "Funciones esenciales con tope de carga mensual."
    },
    referido: {
        id: "referido", nombre: "Referido Seguro", precioUSD: 5, limiteMensual: null,
        descripcion: "Premium desbloqueado al vincularte con un contador afiliado."
    },
    directo: {
        id: "directo", nombre: "Directo Premium", precioUSD: 9, limiteMensual: null,
        descripcion: "Acceso completo sin intermediación de un estudio."
    }
};

export const PLANES_ESTUDIO = {
    trial: {
        id: "trial", nombre: "Free Trial", precioUSD: 0, usuarios: 1, clientes: 15, dias: 30,
        descripcion: "30 días con acceso completo a exportaciones."
    },
    independiente: {
        id: "independiente", nombre: "Independiente", precioUSD: 35, usuarios: 1, clientes: 15,
        descripcion: "Asesores y profesionales autónomos."
    },
    boutique: {
        id: "boutique", nombre: "Estudio Boutique", precioUSD: 89, usuarios: 3, clientes: 50,
        descripcion: "Equipos contables en crecimiento."
    },
    escala: {
        id: "escala", nombre: "Estudio Escala", precioUSD: 149, usuarios: 10, clientes: null,
        descripcion: "Firmas consolidadas y alto volumen."
    }
};

// Nombres anteriores (Obligatorio 1): siguen funcionando para las cuentas ya creadas.
const ALIAS = { plus: "gratuito", premium: "directo" };

export const normalizarPlan = (plan) => ALIAS[plan] ?? plan;

export const PLANES_VALIDOS = [
    ...Object.keys(PLANES_USUARIO), ...Object.keys(PLANES_ESTUDIO), ...Object.keys(ALIAS)
];

export const planDe = (usuario) => {
    const id = normalizarPlan(usuario.plan);
    return usuario.tipo === "estudio" ? PLANES_ESTUDIO[id] : PLANES_USUARIO[id];
};

export const DIAS_TRIAL = PLANES_ESTUDIO.trial.dias;
export const HORAS_INVITACION = 48;

// Primer instante del mes calendario actual (UTC).
export const inicioDeMes = (fecha = new Date()) =>
    new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), 1));
