import test from "node:test";
import assert from "node:assert/strict";
process.env.GEMINI_API_KEY="k"; process.env.GEMINI_MODELO_RESPALDO="modelo-b";
import axios from "axios";
let urls=[]; let plan=[];
axios.defaults.adapter = async (cfg) => { urls.push(cfg.url.match(/models\/([^:]+)/)[1]); const next=plan.shift();
  if(next!==200){const e=new Error("x"); e.response={status:next}; throw e;}
  return {data:{candidates:[{content:{parts:[{text:'{"monto":10,"moneda":"UYU","fecha":null,"tipo":"egreso"}'}]}}]},status:200,statusText:"OK",headers:{},config:cfg};};
const {extraerDatos}=await import("../v1/services/ai/extraccionGemini.provider.js");
const run=async(p)=>{urls=[];plan=[...p];try{const r=await extraerDatos({buffer:Buffer.from("x"),mimeType:"application/pdf"});return "OK "+r.monto+" via "+urls.join(">")}catch(e){return "ERR "+e.message+" | "+urls.join(">")}};
test("Gemini reintenta ante 503 y usa el modelo de respaldo", async () => {
  assert.match(await run([503,200]), /^OK 10 via gemini-3.5-flash-lite>gemini-3.5-flash-lite$/);
  assert.match(await run([503,503,200]), /^OK 10 via .*>.*>modelo-b$/);
  assert.match(await run([503,503,503]), /^ERR/);
});
test("Gemini no reintenta errores no transitorios (401)", async () => {
  assert.match(await run([401,200]), /^ERR .*\| gemini-3.5-flash-lite$/);
});
