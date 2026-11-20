// Este archivo centraliza las llamadas de la aplicación al servidor.
// En Expo Go se usa la IP de la computadora configurada en el .env de la carpeta principal.

const base = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');

export async function api(ruta, opciones = {}) {
  const esFormulario = typeof FormData !== 'undefined' && opciones.body instanceof FormData;
  const encabezados = {
    Accept: 'application/json',
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
    throw new Error(datos?.error || `El servidor respondió con el código ${respuesta.status}.`);
  }

  return datos;
}

// Lee la foto elegida como base64 cuando ImagePicker no la entregó (por ejemplo en web).
async function leerBase64(uri) {
  const respuesta = await fetch(uri);
  const blob = await respuesta.blob();
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(String(lector.result).split(',')[1] || '');
    lector.onerror = () => reject(new Error('No se pudo leer la imagen elegida.'));
    lector.readAsDataURL(blob);
  });
}

// Sube la foto al backend como JSON { image: <base64> }. El backend la envía a ImgBB con la clave de backend/.env.
// Se evita FormData/File porque su soporte cambia entre versiones de Expo y era la causa de los errores.
export async function subirImagenProducto(asset) {
  if (!asset?.uri) {
    throw new Error('Primero elegí una imagen desde la galería del celular.');
  }
  const base64 = asset.base64 || await leerBase64(asset.uri);
  if (!base64) throw new Error('No se pudo leer la imagen elegida. Probá con otra foto.');

  const datos = await api('/imagenes/producto', {
    method: 'POST',
    body: JSON.stringify({ image: base64 }),
  });
  if (!datos?.imagenUrl) {
    throw new Error('El backend no devolvió la dirección de la imagen.');
  }
  return datos;
}
