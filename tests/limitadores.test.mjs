import test from "node:test";
import assert from "node:assert/strict";
import { validarEntorno } from "../v1/config/env.config.js";

test("validarEntorno falla y nombra las variables que faltan", () => {
  const antes = { ...process.env };
  delete process.env.MONGO_URI; delete process.env.JWT_SECRET;
  assert.throws(() => validarEntorno(), /MONGO_URI, JWT_SECRET/);
  process.env.MONGO_URI = "mongodb://x"; process.env.JWT_SECRET = "una-clave-bastante-larga";
  assert.doesNotThrow(() => validarEntorno());
  process.env = antes;
});
