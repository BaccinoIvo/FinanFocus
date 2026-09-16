import app from "./app.js";

// Este archivo es solo para correr localmente con `npm run dev`.
// La conexión a MongoDB ya se hizo al importar app.js (arriba).
// En Vercel, este archivo no se ejecuta: el entry point es app.js directamente.

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
