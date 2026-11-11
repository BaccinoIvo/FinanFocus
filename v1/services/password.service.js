import { hash, verify } from "@node-rs/argon2";
import bcrypt from "bcryptjs";

// Argon2id (el algoritmo por defecto de la librería) con el mínimo que recomienda OWASP:
// 19 MiB de memoria, 2 iteraciones, 1 hilo. A diferencia de bcrypt, cada intento también cuesta memoria.
const OPCIONES = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

// Hash para guardar en la base. La sal va incluida en el propio texto del hash.
export const hashearPassword = (password) => hash(password, OPCIONES);

// Verifica la contraseña contra el hash guardado, sea nuevo (Argon2id) o viejo (bcrypt, empieza con "$2").
// Si era bcrypt y la contraseña es correcta, devuelve además `nuevoHash` para que el login lo guarde:
// así las cuentas existentes migran solas la próxima vez que entran, sin pedirles nada.
export const verificarPassword = async (password, guardado) => {
    try {
        if (guardado.startsWith("$argon2")) {
            return { ok: await verify(guardado, password) };
        }
        const ok = await bcrypt.compare(password, guardado);
        return ok ? { ok, nuevoHash: await hashearPassword(password) } : { ok };
    } catch {
        // Un hash guardado con formato inválido se trata como contraseña incorrecta.
        return { ok: false };
    }
};
