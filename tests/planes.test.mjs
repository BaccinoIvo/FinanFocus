import test from "node:test";
import assert from "node:assert/strict";
process.env.JWT_SECRET="x"; process.env.SALTING_ROUNDS="4";
import crypto from "crypto";
import Usuario from "../v1/models/usuario.model.js";
import Movimiento from "../v1/models/movimiento.model.js";
import Invitacion from "../v1/models/invitacion.model.js";
const U=await import("../v1/controllers/usuarios.controllers.js");
const L=await import("../v1/middlewares/validarLimitePlan.middleware.js");
const E=await import("../v1/controllers/estudio.controllers.js");
const mkRes=()=>{const r={code:200,body:null,status(c){r.code=c;return r},json(b){r.body=b;return r}};return r};
const mk=(o)=>{const u=new Usuario({nombreUsuario:"u",email:"a@a.com",hashedPassword:"h",...o});u.save=async()=>u;return u};
let ok=0,bad=0; const t=(n,c)=>{c?ok++:(bad++,console.log("FALLA",n))};
// límite mensual
let user=mk({plan:"gratuito"}); Usuario.findById=async()=>user;
Movimiento.countDocuments=async()=>4;
let r=mkRes(),nx=false; await L.validarLimitePlan({user:{id:user._id}},r,()=>nx=true); t("gratuito con 4 -> 403",r.code===403&&!nx);
Movimiento.countDocuments=async()=>3; r=mkRes();nx=false; await L.validarLimitePlan({user:{id:user._id}},r,()=>nx=true); t("gratuito con 3 -> pasa",nx);
for(const p of ["plus","referido","directo","premium"]){ user=mk({plan:p}); Movimiento.countDocuments=async()=>99; nx=false; r=mkRes(); await L.validarLimitePlan({user:{id:user._id}},r,()=>nx=true); t("plan "+p+" "+(p==="plus"?"limita":"sin tope"), p==="plus"? r.code===403 : nx); }
// cambio de plan usuario
user=mk({plan:"gratuito"}); r=mkRes(); await U.cambiarPlan({user:{id:user._id},validatedBody:{plan:"directo"}},r); t("gratuito->directo",r.body.data.plan==="directo"&&r.body.token);
r=mkRes(); await U.cambiarPlan({user:{id:user._id},validatedBody:{plan:"referido"}},r); t("referido no se elige",r.code===400);
user=mk({plan:"referido",contador:new Usuario()._id}); r=mkRes(); await U.cambiarPlan({user:{id:user._id},validatedBody:{plan:"gratuito"}},r); t("vinculado no baja a gratuito",r.code===400);
user=mk({plan:"directo"}); r=mkRes(); await U.cambiarPlan({user:{id:user._id},validatedBody:{plan:"directo"}},r); t("mismo plan 400",r.code===400);
// estudio
user=mk({tipo:"estudio",plan:"trial"}); Usuario.countDocuments=async()=>20; r=mkRes(); await U.cambiarPlan({user:{id:user._id},validatedBody:{plan:"independiente"}},r); t("20 clientes no entran en independiente(15)",r.code===409);
r=mkRes(); await U.cambiarPlan({user:{id:user._id},validatedBody:{plan:"boutique"}},r); t("trial->boutique",r.body.data.plan==="boutique"&&user.trialExpiraEl===null);
r=mkRes(); await U.cambiarPlan({user:{id:user._id},validatedBody:{plan:"trial"}},r); t("no se vuelve a trial",r.code===400);
// invitación
const token=crypto.randomBytes(24).toString("hex"); const hash=crypto.createHash("sha256").update(token).digest("hex");
const estudio=mk({tipo:"estudio",plan:"boutique",nombreUsuario:"est"});
let inv={estudio:estudio._id,email:"a@a.com",tokenHash:hash,expiraEl:new Date(Date.now()+1e6),usadaEl:null,save:async()=>{}};
Invitacion.findOne=async()=>inv; user=mk({plan:"gratuito"}); Usuario.findById=async(id)=>String(id)===String(estudio._id)?estudio:user; Usuario.countDocuments=async()=>1;
r=mkRes(); await U.aceptarInvitacion({user:{id:user._id},validatedBody:{token}},r); t("acepta invitación -> referido",r.body?.data?.plan==="referido"&&String(user.contador)===String(estudio._id)&&inv.usadaEl);
r=mkRes(); await U.aceptarInvitacion({user:{id:user._id},validatedBody:{token}},r); t("ya usada/ya vinculado",r.code>=400);
inv.usadaEl=null; user=mk({plan:"gratuito",email:"otro@a.com"}); r=mkRes(); await U.aceptarInvitacion({user:{id:user._id},validatedBody:{token}},r); t("email distinto 403",r.code===403);
inv.expiraEl=new Date(Date.now()-1); user=mk({plan:"gratuito"}); r=mkRes(); await U.aceptarInvitacion({user:{id:user._id},validatedBody:{token}},r); t("vencida 400",r.code===400);
// perfil sombra
Usuario.create=async(d)=>({_id:"id1",...d}); r=mkRes(); await E.crearPerfilSombra({user:{id:"e1"},estudio:mk({tipo:"estudio",plan:"escala"}),validatedBody:{nombre:"Lucía Férreira"}},r);
t("sombra creada",r.code===201&&/^lucia\.ferreira\.[0-9a-f]{6}$/.test(r.body.data.nombreUsuario)); 
Usuario.countDocuments=async()=>15; r=mkRes(); await E.crearPerfilSombra({user:{id:"e1"},estudio:mk({tipo:"estudio",plan:"independiente"}),validatedBody:{nombre:"Ana"}},r); t("cupo lleno 409",r.code===409);
console.log("ok",ok,"fallas",bad);
// ---- perfil
const bcrypt=(await import("bcryptjs")).default;
user=mk({nombreUsuario:"ivo",email:"ivo@a.com",hashedPassword:bcrypt.hashSync("clave123",4)}); Usuario.findById=async()=>user; Usuario.findOne=async()=>null;
r=mkRes(); await U.editarPerfil({user:{id:user._id},validatedBody:{nombreUsuario:"ivo2",email:"IVO2@A.com"}},r); t("editar perfil",r.body.data.email==="ivo2@a.com"&&user.nombreUsuario==="ivo2"&&!!r.body.token&&!("hashedPassword" in r.body.data));
Usuario.findOne=async()=>({_id:"otro"}); r=mkRes(); await U.editarPerfil({user:{id:user._id},validatedBody:{nombreUsuario:"tomado"}},r); t("nombre repetido 409",r.code===409);
r=mkRes(); await U.cambiarPassword({user:{id:user._id},validatedBody:{passwordActual:"mal123",passwordNueva:"nueva123"}},r); t("pass actual incorrecta 400",r.code===400);
r=mkRes(); await U.cambiarPassword({user:{id:user._id},validatedBody:{passwordActual:"clave123",passwordNueva:"clave123"}},r); t("pass igual 400",r.code===400);
r=mkRes(); await U.cambiarPassword({user:{id:user._id},validatedBody:{passwordActual:"clave123",passwordNueva:"nueva123"}},r); t("pass cambiada",r.code===200&&bcrypt.compareSync("nueva123",user.hashedPassword));
test("planes, invitaciones y perfil (modelos simulados)",()=>{assert.equal(bad,0,`${bad} comprobaciones fallaron`);assert.ok(ok>20);});
