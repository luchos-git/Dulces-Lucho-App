// ---------------------------------------------------------------------------
// ¡IMPORTANTE! Estos dos datos son de EJEMPLO. Cambialos por los del local real.
// Para sacar las coordenadas: en Google Maps u OpenStreetMap, clic derecho
// sobre el local y copiás los dos números (latitud y longitud).
// ---------------------------------------------------------------------------
export const LOCAL = { latitude: -34.6037, longitude: -58.3816 };
export const LOCAL_NOMBRE = 'Local Dulces Lucho (dirección de ejemplo)';

// Se agrega al final de lo que escribe el cliente para acotar la búsqueda
const SUFIJO_DIRECCION = 'Buenos Aires, Argentina';

export const UMBRAL_GRATIS_KM = 1.5;
const COSTO_POR_KM_EXTRA = 300;

export function calcularCostoEnvio(distanciaKm) {
  if (distanciaKm <= UMBRAL_GRATIS_KM) return 0;
  const kmExtra = Math.ceil(distanciaKm - UMBRAL_GRATIS_KM);
  return kmExtra * COSTO_POR_KM_EXTRA;
}

// API 1 — Nominatim: convierte la dirección escrita en coordenadas
async function buscarCoordenadas(direccion, localidad) {
  const consulta = [direccion, localidad, SUFIJO_DIRECCION].filter(Boolean).join(', ');
  const url =
    'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=ar&q=' +
    encodeURIComponent(consulta);

  const respuesta = await fetch(url, {
    headers: {
      // Nominatim exige identificar la app; sin esto responde 403
      'User-Agent': 'DulcesLuchoApp/1.0 (proyecto escolar)',
      'Accept-Language': 'es',
    },
  });

  if (!respuesta.ok) {
    throw new Error('No pudimos consultar el mapa. Probá de nuevo en un rato.');
  }

  const resultados = await respuesta.json();
  if (!resultados || resultados.length === 0) {
    throw new Error('No pudimos encontrar esa dirección. Revisá calle, número y localidad.');
  }

  return {
    latitude: parseFloat(resultados[0].lat),
    longitude: parseFloat(resultados[0].lon),
    // Dirección completa que encontró Nominatim, para mostrársela al cliente
    direccionEncontrada: resultados[0].display_name,
  };
}

// API 2 — OSRM: distancia real por las calles entre dos puntos, en km
async function distanciaPorCalles(origen, destino) {
  // OJO: esta API pide primero la longitud y después la latitud
  const url =
    'https://router.project-osrm.org/route/v1/driving/' +
    `${origen.longitude},${origen.latitude};${destino.longitude},${destino.latitude}` +
    '?overview=false';

  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error('Falló el servicio de rutas.');

  const datos = await respuesta.json();
  if (datos.code !== 'Ok' || !datos.routes || datos.routes.length === 0) {
    throw new Error('No se encontró un recorrido.');
  }

  return datos.routes[0].distance / 1000; // la API devuelve metros
}

// Plan B: distancia en línea recta (fórmula de Haversine), por si el servicio de rutas no responde
function distanciaEnLineaRecta(lat1, lon1, lat2, lon2) {
  const R = 6371; // radio de la Tierra en km
  const aRad = (grados) => (grados * Math.PI) / 180;
  const dLat = aRad(lat2 - lat1);
  const dLon = aRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aRad(lat1)) * Math.cos(aRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function calcularEnvio(direccion, localidad = '') {
  const destino = await buscarCoordenadas(direccion, localidad);

  let distanciaKm;
  let metodo = 'calles';
  try {
    distanciaKm = await distanciaPorCalles(LOCAL, destino);
  } catch (e) {
    // Si OSRM no responde, usamos la línea recta para que la app no se rompa
    metodo = 'recta';
    distanciaKm = distanciaEnLineaRecta(
      LOCAL.latitude,
      LOCAL.longitude,
      destino.latitude,
      destino.longitude
    );
  }

  return {
    distanciaKm,
    costo: calcularCostoEnvio(distanciaKm),
    origen: LOCAL_NOMBRE,
    destino: destino.direccionEncontrada,
    metodo, // 'calles' o 'recta'
  };
}
