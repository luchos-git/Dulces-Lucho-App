// explicación del archivo: el backend coordina la búsqueda de direcciones, el recorrido y el precio del envío.
// Las consultas externas se hacen desde un solo servidor, en cola y con caché para no saturar los servicios públicos.

const URL_NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const URL_OSRM = 'https://router.project-osrm.org/route/v1/driving';
const INTERVALO_NOMINATIM_MS = 1100;
const INTERVALO_OSRM_MS = 1100;
const TIEMPO_CACHE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CACHE = 1000;
const UMBRAL_GRATIS_METROS = 1500;
const COSTO_POR_KM_EXTRA = 300;

const cacheDirecciones = new Map();

function crearCola(intervaloMs, maxPendientes = 150) {
  let cola = Promise.resolve();
  let ultimaSolicitud = 0;
  let pendientes = 0;

  return function ejecutarEnTurno(trabajo) {
    if (pendientes >= maxPendientes) {
      return Promise.reject(errorEnvio('Hay muchas solicitudes de envío en espera. Esperá unos segundos y volvé a intentar.', 503, 'cola_llena'));
    }
    pendientes += 1;
    const tareaEnCola = cola.then(async () => {
      const espera = intervaloMs - (Date.now() - ultimaSolicitud);
      if (espera > 0) await new Promise((resolve) => setTimeout(resolve, espera));
      ultimaSolicitud = Date.now();
      return trabajo();
    });
    const tarea = tareaEnCola.finally(() => { pendientes -= 1; });

    // Un error no debe bloquear los turnos que vienen después.
    cola = tarea.then(() => undefined, () => undefined);
    return tarea;
  };
}

// Nominatim y el servidor de demostración de OSRM tienen colas independientes.
const consultarNominatimEnTurno = crearCola(INTERVALO_NOMINATIM_MS);
const consultarOSRMEnTurno = crearCola(INTERVALO_OSRM_MS);

function errorEnvio(mensaje, status = 422, paso = 'envio') {
  const error = new Error(mensaje);
  error.status = status;
  error.paso = paso;
  return error;
}

function normalizarClave(texto) {
  return String(texto || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function coordenadasValidas(latitud, longitud) {
  return Number.isFinite(latitud) && Number.isFinite(longitud)
    && latitud >= -90 && latitud <= 90 && longitud >= -180 && longitud <= 180;
}

function crearCoordenadas(latitud, longitud, etiqueta) {
  const latitude = Number(latitud);
  const longitude = Number(longitud);
  if (!coordenadasValidas(latitude, longitude)) return null;
  return { latitude, longitude, direccionEncontrada: etiqueta || `${latitude}, ${longitude}` };
}

// Admite enlaces largos de Google Maps que incluyan coordenadas o una búsqueda textual.
// No llama a una API de Google ni requiere una clave de Google Maps.
function interpretarUrlMaps(url) {
  const texto = String(url || '').trim();
  const patronesCoordenadas = [
    /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/,
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/,
  ];
  for (const patron of patronesCoordenadas) {
    const coincidencia = texto.match(patron);
    if (coincidencia) {
      const coordenadas = crearCoordenadas(coincidencia[1], coincidencia[2], 'Ubicación tomada del enlace de Google Maps');
      if (coordenadas) return { coordenadas };
    }
  }

  try {
    const urlParseada = new URL(texto);
    const consulta = urlParseada.searchParams.get('q')
      || urlParseada.searchParams.get('query')
      || urlParseada.searchParams.get('destination')
      || urlParseada.searchParams.get('daddr');
    if (consulta) {
      const parCoordenadas = consulta.match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/);
      if (parCoordenadas) {
        const coordenadas = crearCoordenadas(parCoordenadas[1], parCoordenadas[2], 'Ubicación tomada del enlace de Google Maps');
        if (coordenadas) return { coordenadas };
      }
      return { texto: consulta.replace(/\+/g, ' ').trim() };
    }

    const lugar = urlParseada.pathname.match(/\/place\/([^/]+)/i);
    if (lugar?.[1]) {
      return { texto: decodeURIComponent(lugar[1]).replace(/\+/g, ' ').trim() };
    }
    return { texto: '', url: urlParseada };
  } catch {
    return { texto };
  }
}

// Los enlaces cortos maps.app.goo.gl se expanden siguiendo solo redirecciones de dominios de Google.
async function expandirEnlaceCortoMaps(urlInicial) {
  const dominiosGoogle = new Set(['maps.app.goo.gl', 'goo.gl', 'www.google.com', 'google.com', 'maps.google.com']);
  let actual;
  try { actual = new URL(urlInicial); } catch { return ''; }
  if (!dominiosGoogle.has(actual.hostname.toLowerCase())) return '';

  for (let paso = 0; paso < 5; paso += 1) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 10000);
    let respuesta;
    try {
      respuesta = await fetch(actual.toString(), {
        method: 'GET',
        redirect: 'manual',
        headers: { 'User-Agent': 'DulcesLuchoApp/1.0 (servidor de pedidos)' },
        signal: controlador.signal,
      });
    } catch {
      throw errorEnvio('No se pudo abrir el enlace de Google Maps. Pegá la dirección como texto o probá nuevamente.', 422, 'enlace_maps');
    } finally {
      clearTimeout(temporizador);
    }

    const ubicacion = respuesta.headers.get('location');
    if (respuesta.body) await respuesta.body.cancel().catch(() => {});
    if (respuesta.status >= 300 && respuesta.status < 400 && ubicacion) {
      const siguiente = new URL(ubicacion, actual);
      if (!dominiosGoogle.has(siguiente.hostname.toLowerCase())) {
        throw errorEnvio('El enlace compartido no redirige a una ubicación válida de Google Maps.', 422, 'enlace_maps');
      }
      actual = siguiente;
      continue;
    }
    return actual.toString();
  }
  return actual.toString();
}

async function interpretarEntradaDireccion(entrada) {
  const texto = String(entrada || '').trim();
  if (!texto) return { texto: '' };
  const interpretada = interpretarUrlMaps(texto);
  if (interpretada.coordenadas || interpretada.texto) return interpretada;

  const host = interpretada.url?.hostname?.toLowerCase();
  if (host === 'maps.app.goo.gl' || host === 'goo.gl') {
    const expandida = await expandirEnlaceCortoMaps(texto);
    if (expandida) return interpretarUrlMaps(expandida);
  }
  return { texto: '' };
}

async function obtenerJson(url, opciones = {}, nombreServicio = 'el servicio de mapas') {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), 15000);
  try {
    const respuesta = await fetch(url, { ...opciones, signal: controlador.signal });
    if (respuesta.status === 429 || respuesta.status === 503) {
      throw errorEnvio(`${nombreServicio} está ocupado. La solicitud quedó en espera o el proveedor pidió reintentar más tarde. Probá nuevamente en unos segundos.`, 503, 'proveedor_ocupado');
    }
    if (!respuesta.ok) {
      throw errorEnvio(`${nombreServicio} respondió con HTTP ${respuesta.status}. Probá nuevamente más tarde.`, 502, 'proveedor');
    }
    return await respuesta.json();
  } catch (error) {
    if (error.status) throw error;
    if (error.name === 'AbortError') {
      throw errorEnvio(`${nombreServicio} tardó demasiado en responder. Probá nuevamente.`, 504, 'tiempo_espera');
    }
    throw errorEnvio(`No se pudo conectar con ${nombreServicio}. Revisá la conexión del backend e intentá nuevamente.`, 502, 'conexion_proveedor');
  } finally {
    clearTimeout(temporizador);
  }
}

function guardarEnCache(clave, valor) {
  if (cacheDirecciones.size >= MAX_CACHE) {
    const primeraClave = cacheDirecciones.keys().next().value;
    if (primeraClave) cacheDirecciones.delete(primeraClave);
  }
  cacheDirecciones.set(clave, { valor, vence: Date.now() + TIEMPO_CACHE_MS });
}

function leerCache(clave) {
  const guardado = cacheDirecciones.get(clave);
  if (!guardado) return null;
  if (guardado.vence <= Date.now()) {
    cacheDirecciones.delete(clave);
    return null;
  }
  // Actualiza el orden para que el elemento más usado no sea el primero en salir.
  cacheDirecciones.delete(clave);
  cacheDirecciones.set(clave, guardado);
  return guardado.valor;
}

function normalizarTextoDireccion(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Respaldo para la dirección exacta del local configurado.
// Las coordenadas corresponden a Ing. Marconi 745, Avellaneda, según el Mapa Educativo oficial:
// https://mapa.educacion.gob.ar/legajo/060747100
function obtenerCoordenadasConocidasDelLocal(direccion, localidad, tipo) {
  if (tipo !== 'local') return null;

  const calle = normalizarTextoDireccion(direccion);
  const ciudad = normalizarTextoDireccion(localidad);
  const esDireccionConfigurada = /\b(?:ing|ingeniero)\s+marconi\s+745\b/.test(calle);
  const esAvellaneda = /\bavellaneda\b/.test(ciudad);

  if (!esDireccionConfigurada || !esAvellaneda) return null;

  return crearCoordenadas(
    -34.66183661946428,
    -58.36408745647077,
    'Ing. Marconi 745, Avellaneda, Buenos Aires'
  );
}

async function buscarCoordenadas(direccion, localidad, tipo) {
  const entrada = await interpretarEntradaDireccion(direccion);
  if (entrada.coordenadas) return entrada.coordenadas;

  const calle = String(entrada.texto || '').trim();
  const ciudad = String(localidad || '').trim();
  if (!calle || !ciudad) {
    throw errorEnvio(tipo === 'local'
      ? 'La configuración del local necesita una dirección y una localidad. También podés pegar un enlace de Google Maps con su ubicación.'
      : 'Ingresá la calle y el número, además de la localidad de entrega.', 400, tipo);
  }

  const clave = `${normalizarClave(calle)}|${normalizarClave(ciudad)}`;
  const cacheado = leerCache(clave);
  if (cacheado) return cacheado;

  // Evita depender del buscador externo para esta dirección pública ya verificada.
  const coordenadasConocidas = obtenerCoordenadasConocidasDelLocal(calle, ciudad, tipo);
  if (coordenadasConocidas) {
    guardarEnCache(clave, coordenadasConocidas);
    console.info('[ENVÍOS] Se utilizaron las coordenadas de referencia verificadas para Ing. Marconi 745, Avellaneda.');
    return coordenadasConocidas;
  }

  const partesLocalidad = ciudad.split(',').map((parte) => parte.trim()).filter(Boolean);
  const ciudadPrincipal = partesLocalidad[0] || ciudad;
  const provinciaOriginal = partesLocalidad.slice(1).join(' ').trim();
  const provincia = provinciaOriginal
    .replace(/^provincia\s+(de\s+)?/i, '')
    .replace(/^buenos\s+aires$/i, 'Buenos Aires')
    .trim() || 'Buenos Aires';

  const calleExpandida = calle.replace(/^ing\.?\s+/i, 'Ingeniero ');
  const consultas = [
    { q: `${calle}, ${ciudad}, Buenos Aires, Argentina` },
    { q: `${calle}, ${ciudad}, Argentina` },
    { q: `${calleExpandida}, ${ciudadPrincipal}, ${provincia}, Argentina` },
    { street: calleExpandida, city: ciudadPrincipal, state: provincia, country: 'Argentina' },
  ];

  let resultados = [];
  for (const consulta of consultas) {
    const parametros = new URLSearchParams({
      format: 'jsonv2',
      addressdetails: '1',
      limit: '5',
      countrycodes: 'ar',
      'accept-language': 'es',
      ...consulta,
    });
    const url = `${URL_NOMINATIM}?${parametros.toString()}`;

    resultados = await consultarNominatimEnTurno(() => obtenerJson(url, {
      headers: {
        'User-Agent': 'DulcesLuchoApp/1.0 (servidor de pedidos)',
        'Accept-Language': 'es',
      },
    }, 'Nominatim (búsqueda de direcciones)'));

    console.info(
      `[ENVÍOS] Geocodificación (${tipo}): ${consulta.q || `${consulta.street}, ${consulta.city}, ${consulta.state}, ${consulta.country}`} | resultados: ${Array.isArray(resultados) ? resultados.length : 'respuesta inválida'}`
    );

    if (Array.isArray(resultados) && resultados.length) break;
  }

  if (!Array.isArray(resultados) || !resultados.length) {
    throw errorEnvio(tipo === 'local'
      ? 'No se pudo ubicar la dirección guardada del local en el mapa. Revisá la calle y localidad en Configuración de la tienda o pegá un enlace de Google Maps que incluya las coordenadas del lugar.'
      : 'No se pudo ubicar la dirección de entrega. Revisá la calle, el número y la localidad, o pegá un enlace de Google Maps con las coordenadas.', 422, tipo);
  }

  const resultado = resultados
    .map((item) => crearCoordenadas(item.lat, item.lon, item.display_name))
    .find(Boolean);
  if (!resultado) throw errorEnvio('El buscador devolvió coordenadas inválidas.', 502, 'geocodificacion');

  guardarEnCache(clave, resultado);
  return resultado;
}

async function calcularMetrosPorCalles(origen, destino) {
  const url = `${URL_OSRM}/${origen.longitude},${origen.latitude};${destino.longitude},${destino.latitude}?overview=false&alternatives=false&steps=false`;
  const datos = await consultarOSRMEnTurno(() => obtenerJson(url, {
    headers: { 'User-Agent': 'DulcesLuchoApp/1.0 (servidor de pedidos)' },
  }, 'OSRM (cálculo de recorrido)'));

  if (datos.code !== 'Ok' || !Array.isArray(datos.routes) || !datos.routes.length) {
    throw errorEnvio('No se encontró un recorrido por calles entre el local y la dirección de entrega. Revisá ambas ubicaciones.', 422, 'ruta');
  }

  const metros = Number(datos.routes[0].distance);
  if (!Number.isFinite(metros) || metros < 0) {
    throw errorEnvio('El servicio de rutas devolvió una distancia inválida.', 502, 'ruta');
  }
  return metros;
}

function calcularPrecioEnvio(metros, costoBase = 0) {
  const base = Number(costoBase || 0);
  if (!Number.isFinite(base) || base < 0) {
    throw errorEnvio('El costo base configurado para el envío no es válido.', 500, 'configuracion');
  }

  const metrosExtra = Math.max(0, metros - UMBRAL_GRATIS_METROS);
  const tramosExtra = Math.ceil(metrosExtra / 1000);
  const costoDistancia = tramosExtra * COSTO_POR_KM_EXTRA;
  return { costoDistancia, costoBase: base, costoTotal: costoDistancia + base };
}

// El backend recibe al cliente, obtiene el local desde MySQL y coordina las APIs en orden.
export async function calcularEnvioDesdeBackend({ direccionCliente, localidadCliente, configuracionTienda }) {
  const direccionLocal = String(configuracionTienda?.direccion || '').trim();
  const localidadLocal = String(configuracionTienda?.localidad || '').trim();

  if (!direccionLocal || !localidadLocal) {
    throw errorEnvio('El administrador debe completar la dirección y localidad del local en Configuración de la tienda.', 409, 'configuracion');
  }
  if (configuracionTienda?.envioHabilitado === false) {
    throw errorEnvio('La tienda no tiene habilitado el envío a domicilio.', 409, 'configuracion');
  }

  // Primero se procesa la dirección del cliente y después la del local, como parte del mismo pedido.
  const destino = await buscarCoordenadas(direccionCliente, localidadCliente, 'cliente');
  const origen = await buscarCoordenadas(direccionLocal, localidadLocal, 'local');
  const distanciaMetros = await calcularMetrosPorCalles(origen, destino);
  const precio = calcularPrecioEnvio(distanciaMetros, configuracionTienda?.costoEnvioBase);

  return {
    distanciaMetros: Math.round(distanciaMetros),
    distanciaKm: Number((distanciaMetros / 1000).toFixed(2)),
    costoDistancia: precio.costoDistancia,
    costoEnvioBase: precio.costoBase,
    costo: precio.costoTotal,
    origen: [configuracionTienda?.nombre || 'Dulces Lucho', direccionLocal, localidadLocal].join(' · '),
    destino: destino.direccionEncontrada,
    metodo: 'calles',
  };
}
