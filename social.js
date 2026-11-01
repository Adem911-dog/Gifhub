(() => {
 const identity=window.netlifyIdentity;
 if(!identity){console.warn("Netlify Identity widget absent.");return;}
 async function request(path,options={}){
  const user=identity.currentUser();if(!user)throw new Error("Connecte-toi d'abord.");
  const token=await new Promise((resolve,reject)=>user.jwt((e,t)=>e?reject(e):resolve(t)));
  const response=await fetch(path,{...options,headers:{"content-type":"application/json",authorization:`Bearer ${token}`,...(options.headers||{})}});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Erreur API.");return data;
 }
 async function uploadMedia(file){
  if(!file||(!file.type.startsWith("image/")&&!file.type.startsWith("video/")))throw new Error("Choisis une image ou une vidéo.");
  const s=await request("/api/upload-signature",{method:"POST",body:"{}"}),form=new FormData();
  form.append("file",file);form.append("api_key",s.api_key);form.append("timestamp",s.timestamp);form.append("folder",s.folder);form.append("signature",s.signature);
  const kind=file.type.startsWith("video/")?"video":"image";
  const r=await fetch(`https://api.cloudinary.com/v1_1/${s.cloud_name}/${kind}/upload`,{method:"POST",body:form}),data=await r.json();
  if(!r.ok)throw new Error(data.error?.message||"Échec Cloudinary.");
  return {url:data.secure_url,public_id:data.public_id,thumbnail_url:data.thumbnail_url||null};
 }
 window.GifhubSocial={
  request,uploadMedia,getProfile:()=>request("/api/me"),
  saveProfile:data=>request("/api/profile",{method:"PUT",body:JSON.stringify(data)}),
  listVideos:()=>request("/api/videos"),
  publishVideo:data=>request("/api/videos",{method:"POST",body:JSON.stringify(data)}),
  deleteVideo:id=>request(`/api/videos/${id}`,{method:"DELETE"}),
  toggleLike:id=>request(`/api/videos/${id}/like`,{method:"POST",body:"{}"}),
  toggleFavorite:id=>request(`/api/videos/${id}/favorite`,{method:"POST",body:"{}"}),
  getComments:id=>request(`/api/videos/${id}/comments`),
  addComment:(id,body)=>request(`/api/videos/${id}/comments`,{method:"POST",body:JSON.stringify({body})}),
  recordView:id=>request(`/api/videos/${id}/view`,{method:"POST",body:"{}"})
 };
})();
