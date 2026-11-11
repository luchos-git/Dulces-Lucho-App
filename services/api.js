// En un teléfono físico reemplazá localhost por la IP de tu PC:
// EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api
const base=process.env.EXPO_PUBLIC_API_URL||'http://localhost:3000/api';
export async function api(ruta,opciones={}){let r;try{r=await fetch(base+ruta,{headers:{Accept:'application/json',...(opciones.body instanceof FormData?{}:{'Content-Type':'application/json'}),...opciones.headers},...opciones})}catch{throw Error('No se pudo conectar a la API. Revisá que el backend esté iniciado y la URL sea accesible.')}const d=r.status===204?null:await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'La operación falló.');return d}
export async function subirImagenProducto(a){const f=new FormData();f.append('image',{uri:a.uri,name:a.fileName||'producto.jpg',type:a.mimeType||'image/jpeg'});return api('/imagenes/producto',{method:'POST',body:f})}
