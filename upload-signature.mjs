import {createHash} from "node:crypto";
import {json,requireUser,fail} from "./_shared.mjs";
export default async function handler(req){
 try{
  if(req.method!=="POST")return json({error:"Méthode non autorisée."},405);
  await requireUser(req);
  const cloud=process.env.CLOUDINARY_CLOUD_NAME,key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;
  if(!cloud||!key||!secret)throw Object.assign(new Error("Configuration Cloudinary incomplète."),{status:500});
  const timestamp=Math.floor(Date.now()/1000),folder="gifhub";
  const signature=createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
  return json({cloud_name:cloud,api_key:key,timestamp,folder,signature});
 }catch(e){return fail(e)}
}
export const config={path:"/api/upload-signature"};
