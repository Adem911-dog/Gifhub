import {db,json,requireUser,readJson,fail} from "./_shared.mjs";
export default async function handler(req){
 try{
  const user=await requireUser(req), sql=db(), p=new URL(req.url).pathname.replace(/^\/api\/?/,"").split("/").filter(Boolean), id=p[1]?Number(p[1]):null;
  if(p[0]==="me"&&req.method==="GET"){
   const r=await sql.sql`SELECT user_id,username,avatar_url,banner_url,bio FROM profiles WHERE user_id=${user.id}`;return json(r[0]||null);
  }
  if(p[0]==="profile"&&req.method==="PUT"){
   const b=await readJson(req), username=String(b.username||"").trim().slice(0,30);
   if(username.length<2)return json({error:"Pseudo trop court."},400);
   const bio=String(b.bio||"").slice(0,280), avatar=b.avatar_url||null, banner=b.banner_url||null;
   const r=await sql.sql`INSERT INTO profiles(user_id,username,avatar_url,banner_url,bio) VALUES(${user.id},${username},${avatar},${banner},${bio})
   ON CONFLICT(user_id) DO UPDATE SET username=EXCLUDED.username,avatar_url=COALESCE(EXCLUDED.avatar_url,profiles.avatar_url),banner_url=COALESCE(EXCLUDED.banner_url,profiles.banner_url),bio=EXCLUDED.bio,updated_at=NOW()
   RETURNING user_id,username,avatar_url,banner_url,bio`;return json(r[0]);
  }
  if(p[0]==="videos"&&req.method==="GET"){
   return json(await sql.sql`SELECT v.id,v.title,v.description,v.video_url,v.thumbnail_url,v.created_at,p.username,p.avatar_url,
   (SELECT COUNT(*) FROM video_likes l WHERE l.video_id=v.id)::int AS likes,
   (SELECT COUNT(*) FROM video_comments c WHERE c.video_id=v.id)::int AS comments,
   (SELECT COUNT(*) FROM video_views w WHERE w.video_id=v.id)::int AS views
   FROM videos v JOIN profiles p ON p.user_id=v.user_id ORDER BY v.created_at DESC LIMIT 100`);
  }
  if(p[0]==="videos"&&req.method==="POST"){
   const b=await readJson(req), title=String(b.title||"").trim().slice(0,100), description=String(b.description||"").slice(0,2000), publicId=String(b.cloudinary_public_id||""), videoUrl=String(b.video_url||"");
   if(!title||!publicId||!/^https:\/\/res\.cloudinary\.com\//.test(videoUrl))return json({error:"Données vidéo invalides."},400);
   const r=await sql.sql`INSERT INTO videos(user_id,title,description,cloudinary_public_id,video_url,thumbnail_url) VALUES(${user.id},${title},${description},${publicId},${videoUrl},${b.thumbnail_url||null}) RETURNING *`;return json(r[0],201);
  }
  if(p[0]==="videos"&&id&&req.method==="DELETE"){
   const r=await sql.sql`DELETE FROM videos WHERE id=${id} AND user_id=${user.id} RETURNING id`;return r.length?json({deleted:true}):json({error:"Vidéo introuvable ou non propriétaire."},404);
  }
  if(p[0]==="videos"&&id&&p[2]==="like"&&req.method==="POST"){
   const r=await sql.sql`SELECT 1 FROM video_likes WHERE video_id=${id} AND user_id=${user.id}`;
   if(r.length)await sql.sql`DELETE FROM video_likes WHERE video_id=${id} AND user_id=${user.id}`;
   else await sql.sql`INSERT INTO video_likes(video_id,user_id) VALUES(${id},${user.id}) ON CONFLICT DO NOTHING`;
   return json({liked:!r.length});
  }
  if(p[0]==="videos"&&id&&p[2]==="favorite"&&req.method==="POST"){
   const r=await sql.sql`SELECT 1 FROM video_favorites WHERE video_id=${id} AND user_id=${user.id}`;
   if(r.length)await sql.sql`DELETE FROM video_favorites WHERE video_id=${id} AND user_id=${user.id}`;
   else await sql.sql`INSERT INTO video_favorites(video_id,user_id) VALUES(${id},${user.id}) ON CONFLICT DO NOTHING`;
   return json({favorited:!r.length});
  }
  if(p[0]==="videos"&&id&&p[2]==="comments"&&req.method==="GET")
   return json(await sql.sql`SELECT c.id,c.body,c.created_at,p.username,p.avatar_url FROM video_comments c JOIN profiles p ON p.user_id=c.user_id WHERE c.video_id=${id} ORDER BY c.created_at LIMIT 200`);
  if(p[0]==="videos"&&id&&p[2]==="comments"&&req.method==="POST"){
   const b=await readJson(req), body=String(b.body||"").trim();if(!body||body.length>2000)return json({error:"Commentaire invalide."},400);
   const r=await sql.sql`INSERT INTO video_comments(video_id,user_id,body) VALUES(${id},${user.id},${body}) RETURNING id,body,created_at`;return json(r[0],201);
  }
  if(p[0]==="videos"&&id&&p[2]==="view"&&req.method==="POST"){
   await sql.sql`INSERT INTO video_views(video_id,viewer_key) VALUES(${id},${user.id}) ON CONFLICT DO NOTHING`;
   const r=await sql.sql`SELECT COUNT(*)::int AS views FROM video_views WHERE video_id=${id}`;return json(r[0]);
  }
  return json({error:"Route introuvable."},404);
 }catch(e){return fail(e)}
}
export const config={path:"/api/*"};
