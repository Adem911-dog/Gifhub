import { getDatabase } from "@netlify/database";
export const db = () => getDatabase();
export const json = (data, status=200) => new Response(JSON.stringify(data), {status, headers:{"content-type":"application/json; charset=utf-8"}});
export async function requireUser(req) {
  const token=(req.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!token) throw Object.assign(new Error("Connexion requise."),{status:401});
  const r=await fetch(`${process.env.URL}/.netlify/identity/user`,{headers:{authorization:`Bearer ${token}`}});
  if(!r.ok) throw Object.assign(new Error("Session invalide."),{status:401});
  const u=await r.json(); if(!u?.id) throw Object.assign(new Error("Utilisateur invalide."),{status:401});
  return {id:String(u.id)};
}
export async function readJson(req){try{return await req.json()}catch{throw Object.assign(new Error("JSON invalide."),{status:400})}}
export function fail(e){console.error(e);return json({error:e.message||"Erreur serveur."},e.status||500)}
