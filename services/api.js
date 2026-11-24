// Este archivo centraliza las llamadas de la aplicación al servidor.
// En Expo Go se usa la IP de la computadora configurada en el .env de la carpeta principal.

const base = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
let tokenSesionActual = '';

// El token queda solo en memoria. Al cerrar sesión se elimina y el usuario debe autenticarse otra vez.
export function configurarTokenSesion(token) {
  tokenSesionActual = String(token || '').trim();
}

export async function api(ruta, opciones = {}) {
  const esFormulario = typeof FormData !== 'undefined' && opciones.body instanceof FormData;
  const encabezados = {
    Accept: 'application/json',
    ...(tokenSesionActual ? { Authorization: `Bearer ${tokenSesionActual}` } : {}),
    // En FormData no se define Content-Type manualmente: fetch agrega el boundary correcto.
    ...(!esFormulario ? { 'Content-Type': 'application/json' } : {}),
    ...(opciones.headers || {}),
  };

  let respuesta;
  try {
    respuesta = await fetch(`${base}${ruta}`, {
      ...opciones,
      headers: encabezados,
    });
  } catch (error) {
    const detalle = error?.message ? ` Detalle: ${error.message}` : '';
    throw new Error(`No se pudo conectar con ${base}${ruta}.${detalle} Comprobá que el backend siga activo, que la IP de .env sea la actual y que la red permita la comunicación entre dispositivos.`);
  }

  const texto = await respuesta.text();
  let datos = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = { error: texto };
    }
  }

  if (!respuesta.ok) {
    const error = new Error(datos?.error || `El servidor respondió con el código ${respuesta.status}.`);
    error.status = respuesta.status;
    error.detalle = datos?.detalle || datos?.codigo || '';
    throw error;
  }

  return datos;
}

// Convierte el asset del selector a base64. En Expo se solicita base64 al ImagePicker;
// la lectura por URI queda como respaldo para dispositivos que no lo devuelvan.
async function obtenerBase64Imagen(asset) {
  let base64 = typeof asset.base64 === 'string' ? asset.base64 : '';
  if (!base64 && asset.uri) {
    const respuesta = await fetch(asset.uri);
    if (!respuesta.ok) throw new Error(`No se pudo leer la foto elegida (HTTP ${respuesta.status}).`);
    const blob = await respuesta.blob();
    base64 = await new Promise((resolve, reject) => {
      if (typeof FileReader === 'undefined') {
        reject(new Error('El dispositivo no pudo convertir la foto. Volvé a elegirla e intentá nuevamente.'));
        return;
      }
      const lector = new FileReader();
      lector.onload = () => resolve(String(lector.result || '').split(',')[1] || '');
      lector.onerror = () => reject(new Error('No se pudo leer la foto desde el dispositivo.'));
      lector.readAsDataURL(blob);
    });
  }
  const limpio = String(base64 || '').replace(/^data:[^;]+;base64,/i, '').trim();
  if (!limpio) throw new Error('El selector no entregó los datos de la foto. Cerrá la galería, volvé a elegirla e intentá otra vez.');
  return limpio;
}

// Envía la foto como base64 en una única solicitud: Expo Go puede manejar este formato
// sin depender del soporte multipart de archivos nativos de React Native.
// El backend la sube a ImgBB y guarda la URL en MySQL en la misma operación.
export async function subirImagenPerfil(asset, usuarioId) {
  if (!asset?.uri) throw new Error('Primero elegí una imagen desde la galería del celular.');
  if (!usuarioId) throw new Error('No se encontró el ID de tu cuenta. Volvé a iniciar sesión.');
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('La foto pesa más de 5 MB. Elegí otra imagen.');

  const image = await obtenerBase64Imagen(asset);
  const guardada = await api(`/usuarios/${usuarioId}/foto-perfil`, {
    method: 'POST',
    body: JSON.stringify({ image }),
  });
  if (!guardada?.fotoPerfilUrl) {
    throw new Error(guardada?.error || 'La imagen se subió, pero el servidor no devolvió la URL guardada en tu perfil.');
  }
  return guardada;
}

// Se mantiene disponible para imágenes de productos (y cualquier otro flujo que lo utilice).
export function subirImagenProducto(asset) {
  return subirImagenImgBB(asset, '/imagenes/producto');
}

async function subirImagenImgBB(asset, ruta) {
  if (!asset?.uri) throw new Error('Primero elegí una imagen desde la galería del celular.');
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('La imagen debe pesar hasta 5 MB.');
  const image = await obtenerBase64Imagen(asset);
  const datos = await api(ruta, { method: 'POST', body: JSON.stringify({ image }) });
  const imagenUrl = datos?.imagenUrl || datos?.displayUrl;
  if (!imagenUrl) throw new Error('El backend no devolvió la dirección de la imagen.');
  return { ...datos, imagenUrl };
}
