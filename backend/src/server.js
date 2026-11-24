import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import mysql from 'mysql2/promise';

const app = express();
const port = Number(process.env.PORT || 3000);

// Tokens temporales de un solo uso para modificar correo o contraseña.
const tokensProteccionCuenta = new Map();
const intentosProteccionCuenta = new Map();
// Sesiones temporales emitidas después de validar credenciales y, para admin, su clave única.
const sesionesActivas = new Map();

// Pool reutilizable para las consultas a MySQL.
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dulces_lucho',
  waitForConnections: true,
  connectionLimit: 8,
});

// Recibe imágenes en memoria (multipart desde Thunder Client o JSON base64 desde Expo Go). Límite: 5 MB.
const MAX_IMAGEN = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGEN, files: 1 },
});

app.use(cors());
// El JSON lleva la foto en base64 (ocupa ~33% más que el archivo), por eso el límite es mayor.
app.use(express.json({ limit: '12mb' }));

// Detecta si los bytes son realmente una imagen, sin depender del Content-Type que mande el cliente
// (Thunder Client suele mandar application/octet-stream y Expo puede mandar el tipo vacío).
function detectarImagen(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.subarray(0, 3).toString('latin1') === 'GIF') return 'image/gif';
  if (buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  if (buf.subarray(0, 2).toString('latin1') === 'BM') return 'image/bmp';
  return null;
}

const selectProductos = `
  SELECT p.id, p.nombre, c.nombre AS categoria, p.descripcion, p.precio,
         p.imagen_url AS imagenUrl, p.imagen_url AS miniaturaUrl, p.imagenes_json AS imagenesJson, p.activo,
         p.stock_disponible AS stockDisponible, p.stock_minimo AS stockMinimo,
         p.destacado_dia AS destacadoDia, p.destacado_orden AS destacadoOrden,
         p.proveedor_id AS proveedorId, p.dias_reposicion_estimados AS diasReposicionEstimados
  FROM productos p
  INNER JOIN categorias c ON c.id = p.categoria_id
`;

function validarProducto(producto) {
  if (!producto || typeof producto !== 'object') return 'No se recibieron los datos del producto.';
  if (!producto.nombre?.trim()) return 'Completá el nombre del producto.';
  if (!producto.categoria?.trim()) return 'Elegí una categoría.';
  if (producto.precio === '' || producto.precio === null || producto.precio === undefined ||
      !Number.isFinite(Number(producto.precio)) || Number(producto.precio) <= 0) {
    return 'Ingresá un precio mayor a cero.';
  }
  if (producto.imagenUrl && String(producto.imagenUrl).length > 1000) {
    return 'La dirección de la imagen supera los 1000 caracteres.';
  }
  if (Array.isArray(producto.imagenes) && producto.imagenes.length > 3) return 'Cada producto puede tener como máximo tres imágenes.';
  return null;
}

// Convierte los formatos antiguos y nuevos de la base de datos en una lista uniforme de URLs.
function normalizarListaImagenes(valor, imagenPrincipal = '') {
  let lista = valor;
  if (Buffer.isBuffer(lista)) lista = lista.toString('utf8');

  // Compatibilidad con JSON normal, JSON doblemente serializado y formatos viejos de ImgBB.
  for (let intento = 0; intento < 2 && typeof lista === 'string' && lista.trim(); intento += 1) {
    const texto = lista.trim();
    try {
      lista = JSON.parse(texto);
    } catch {
      lista = /^https?:\/\//i.test(texto) ? [texto] : [];
      break;
    }
  }
  if (!Array.isArray(lista)) lista = lista ? [lista] : [];

  const urls = lista.map((item) => {
    if (typeof item === 'string') return item;
    return item?.url || item?.imagenUrl || item?.imageUrl || item?.src || item?.displayUrl || item?.display_url || item?.data?.url || item?.data?.display_url || '';
  }).map((url) => String(url || '').trim()).filter((url) => /^https?:\/\//i.test(url));

  const principal = String(imagenPrincipal || '').trim();
  if (!urls.length && principal && /^https?:\/\//i.test(principal)) urls.push(principal);
  return [...new Set(urls)].slice(0, 3);
}

function normalizarProducto(producto) {
  const principal = producto.imagenUrl || producto.imagen_url || producto.miniaturaUrl || producto.miniatura_url || producto.portada || producto.imagen || '';
  const imagenes = normalizarListaImagenes(
    producto.imagenesJson ?? producto.imagenes_json ?? producto.imagenes ?? producto.galeria,
    principal
  );
  const miniaturaUrl = imagenes[0] || principal || '';
  return {
    ...producto, imagenes, imagenUrl: miniaturaUrl, miniaturaUrl,
    stockDisponible: Number(producto.stockDisponible ?? producto.stock_disponible ?? 0),
    stockMinimo: Number(producto.stockMinimo ?? producto.stock_minimo ?? 0),
    destacadoDia: Boolean(Number(producto.destacadoDia ?? producto.destacado_dia ?? 0)),
    destacadoOrden: Number(producto.destacadoOrden ?? producto.destacado_orden ?? 0),
    proveedorId: producto.proveedorId ?? producto.proveedor_id ?? null,
    diasReposicionEstimados: Number(producto.diasReposicionEstimados ?? producto.dias_reposicion_estimados ?? 7),
  };
}

function obtenerImagenesEntrada(producto) {
  const principal = String(
    producto?.imagenUrl || producto?.imagen_url || producto?.miniaturaUrl ||
    producto?.miniatura_url || producto?.portada || ''
  ).trim();
  return normalizarListaImagenes(
    producto?.imagenes ?? producto?.imagenesJson ?? producto?.imagenes_json ?? producto?.galeria,
    principal
  );
}

// Busca una categoría existente sin crear registros nuevos desde el formulario.
async function obtenerCategoriaExistente(nombre) {
  const [[categoria]] = await db.query(
    `SELECT id, nombre FROM categorias
     WHERE LOWER(TRIM(nombre)) = LOWER(TRIM(?))
     LIMIT 1`,
    [nombre]
  );
  return categoria || null;
}

// Sesión de servidor: el adminId que manda el cliente NO alcanza para autorizar una acción.
function leerSesion(req) {
  const encabezado = String(req.headers.authorization || '');
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7).trim() : '';
  if (!token) return null;
  const sesion = sesionesActivas.get(token);
  if (!sesion || sesion.expira <= Date.now()) {
    sesionesActivas.delete(token);
    return null;
  }
  return { ...sesion, token };
}

function crearTokenSesion(usuarioId) {
  const token = randomBytes(32).toString('hex');
  sesionesActivas.set(token, { usuarioId: Number(usuarioId), expira: Date.now() + 12 * 60 * 60 * 1000 });
  return token;
}

function parsearPermisos(valor) {
  try {
    const permisos = typeof valor === 'string' ? JSON.parse(valor || '[]') : valor;
    return Array.isArray(permisos) ? permisos.filter((p) => typeof p === 'string') : [];
  } catch { return []; }
}

async function cargarDatosSesion(usuarioId) {
  const [[fila]] = await db.query(
    `SELECT u.id, u.nombre, u.email, u.telefono, u.foto_perfil_url AS fotoPerfilUrl, u.rol,
            u.permisos_admin_json AS permisosAdminJson,
            EXISTS(SELECT 1 FROM propietario_sistema ps WHERE ps.usuario_id = u.id) AS esPropietario
     FROM usuarios u WHERE u.id = ? AND u.activo = 1 LIMIT 1`, [usuarioId]
  );
  if (!fila) return null;
  const permisosAdmin = parsearPermisos(fila.permisosAdminJson);
  return {
    id: fila.id, nombre: fila.nombre, email: fila.email, telefono: fila.telefono || '',
    fotoPerfilUrl: fila.fotoPerfilUrl || '', rol: fila.rol,
    esPropietario: Boolean(Number(fila.esPropietario)), permisosAdmin,
    permisos: Boolean(Number(fila.esPropietario)) ? ['*'] : permisosAdmin,
  };
}

async function verificarPermisoAdmin(req, permiso, adminIdOpcional = null) {
  const sesion = leerSesion(req);
  if (!sesion || (adminIdOpcional != null && sesion.usuarioId !== Number(adminIdOpcional))) return false;
  const datos = await cargarDatosSesion(sesion.usuarioId);
  if (!datos || datos.rol !== 'admin') return false;
  if (datos.esPropietario) return true;
  return Boolean(permiso && datos.permisosAdmin.includes(permiso));
}

async function verificarPropietario(req) {
  const sesion = leerSesion(req);
  if (!sesion) return false;
  const [[fila]] = await db.query(
    `SELECT u.id FROM usuarios u INNER JOIN propietario_sistema ps ON ps.usuario_id = u.id
     WHERE u.id = ? AND u.rol = 'admin' AND u.activo = 1 LIMIT 1`, [sesion.usuarioId]
  );
  return Boolean(fila);
}

function verificarSesionPropia(req, usuarioId) {
  const sesion = leerSesion(req);
  return Boolean(sesion && sesion.usuarioId === Number(usuarioId));
}

function revocarSesionesUsuario(usuarioId) {
  for (const [token, datos] of sesionesActivas) {
    if (datos.usuarioId === Number(usuarioId)) sesionesActivas.delete(token);
  }
}

const PERMISOS_ADMIN = [
  { codigo: 'gestionar_productos', nombre: 'Productos y categorías' },
  { codigo: 'gestionar_pedidos', nombre: 'Pedidos y ventas' },
  { codigo: 'ver_reportes', nombre: 'Reportes y estadísticas' },
  { codigo: 'gestionar_usuarios', nombre: 'Administrar clientes' },
  { codigo: 'gestionar_empleados', nombre: 'Habilitar o pausar empleados administradores' },
  { codigo: 'gestionar_banners', nombre: 'Banners del inicio' },
  { codigo: 'configurar_tienda', nombre: 'Configuración de la tienda' },
  { codigo: 'gestionar_insumos', nombre: 'Administrar stock de productos y proveedores' },
  { codigo: 'solicitar_compras', nombre: 'Solicitar reposiciones y pedidos grandes a proveedores' },
];

async function exigirSesionUsuario(req, res, usuarioId) {
  if (!verificarSesionPropia(req, usuarioId)) {
    res.status(401).json({ error: 'La sesión no corresponde a esta cuenta. Cerrá sesión e ingresá nuevamente.' });
    return false;
  }
  const [[fila]] = await db.query('SELECT id FROM usuarios WHERE id = ? AND activo = 1 LIMIT 1', [Number(usuarioId)]);
  if (!fila) { res.status(401).json({ error: 'La cuenta está inactiva o ya no existe.' }); return false; }
  return true;
}

const METODOS_PAGO_VALIDOS = ['credito', 'debito', 'rapipago'];
const ESTADOS_PEDIDO_VALIDOS = ['confirmado', 'preparando', 'en_camino', 'listo_para_retirar', 'entregado', 'cancelado'];

function normalizarConfiguracionTienda(fila = {}) {
  return {
    nombre: fila.nombre || 'Dulces Lucho',
    telefono: fila.telefono || '',
    email: fila.email || '',
    direccion: fila.direccion || '',
    localidad: fila.localidad || '',
    descripcion: fila.descripcion || '',
    horario: fila.horario || '',
    condicionesVenta: fila.condiciones_venta || '',
    envioHabilitado: Boolean(Number(fila.envio_habilitado ?? 1)),
    costoEnvioBase: Number(fila.costo_envio_base || 0),
    metodosPago: {
      credito: Boolean(Number(fila.pago_credito_activo ?? 1)),
      debito: Boolean(Number(fila.pago_debito_activo ?? 1)),
      rapipago: Boolean(Number(fila.pago_rapipago_activo ?? 1)),
    },
  };
}

async function obtenerConfiguracionTienda() {
  const [[fila]] = await db.query('SELECT * FROM configuracion_tienda WHERE id = 1');
  return normalizarConfiguracionTienda(fila || {});
}

// Comprueba que el teléfono llega al proceso Express, sin consultar MySQL.
app.get('/api/ping', (_req, res) => res.json({ ok: true, mensaje: 'Backend accesible por red.' }));

app.get('/api/estado', async (_req, res) => {
  try {
    // Además de probar la conexión, verifica que exista la tabla y las columnas usadas por el registro.
    await db.query(
      'SELECT id, nombre, email, telefono, foto_perfil_url, direccion_entrega, localidad_entrega, metodo_pago_preferido, notificaciones_activas, password_hash, rol, clave_unica_hash, activo FROM usuarios LIMIT 0'
    );
    await db.query('SELECT numero, estado_pedido FROM ventas LIMIT 0');
    await db.query('SELECT * FROM configuracion_tienda LIMIT 0');
    await db.query('SELECT id, titulo, imagen_url, orden, activo, creado_en FROM banners LIMIT 0');
    await db.query('SELECT id, usuario_id FROM propietario_sistema LIMIT 0');
    await db.query('SELECT stock_disponible, stock_minimo, destacado_dia, destacado_orden, proveedor_id, dias_reposicion_estimados FROM productos LIMIT 0');
    await db.query('SELECT id, nombre, plazo_entrega_dias, activo FROM proveedores LIMIT 0');
    await db.query('SELECT id, proveedor_id, tipo, estado, fecha_estimada_recepcion FROM pedidos_proveedor LIMIT 0');
    await db.query('SELECT pedido_proveedor_id, producto_id, cantidad_solicitada, cantidad_recibida FROM detalle_pedidos_proveedor LIMIT 0');
    await db.query('SELECT id, usuario_id, producto_id, cantidad, fecha_estimada_reposicion, estado FROM pedidos_anticipados LIMIT 0');
    res.json({ ok: true, mensaje: 'Backend, MySQL, productos, stock, proveedores, reposiciones, pedidos anticipados y banners conectados.' });
  } catch (error) {
    console.error('Error al verificar MySQL/tabla usuarios:', error.code || '', error.sqlMessage || error.message);
    res.status(503).json({
      error: 'No se pudo verificar la base de datos o la tabla usuarios. Revisá XAMPP, backend/.env y la estructura de la tabla.',
      detalle: process.env.NODE_ENV === 'production' ? undefined : (error.sqlMessage || error.message),
    });
  }
});

// Lista las categorías cargadas en MySQL para mostrar un selector en el formulario.
app.get('/api/categorias', async (_req, res) => {
  try {
    const [categorias] = await db.query(
      'SELECT id, nombre FROM categorias ORDER BY nombre ASC'
    );
    // Garantiza las categorías principales sin duplicarlas.
    for (const nombre of ['Bolsitas', 'Jugos', 'Combos']) {
      await db.query('INSERT IGNORE INTO categorias (nombre) VALUES (?)', [nombre]);
    }
    const [actualizadas] = await db.query('SELECT id, nombre FROM categorias ORDER BY nombre ASC');
    res.json(actualizadas);
  } catch (error) {
    console.error('Error al consultar categorías:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar las categorías.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// CREATE: agrega una categoría nueva evitando duplicados por mayúsculas o espacios.
app.post('/api/categorias', async (req, res) => {
  if (!await verificarPermisoAdmin(req, 'gestionar_productos')) return res.status(403).json({ error: 'No tenés permiso para administrar categorías.' });
  const nombre = String(req.body?.nombre || '').trim().replace(/\s+/g, ' ');
  if (!nombre) return res.status(400).json({ error: 'Escribí el nombre de la categoría.' });
  if (nombre.length > 60) return res.status(400).json({ error: 'La categoría no puede superar los 60 caracteres.' });
  try {
    const existente = await obtenerCategoriaExistente(nombre);
    if (existente) return res.status(409).json({ error: `La categoría \"${existente.nombre}\" ya existe.` });
    const [resultado] = await db.query('INSERT INTO categorias (nombre) VALUES (?)', [nombre]);
    res.status(201).json({ id: resultado.insertId, nombre });
  } catch (error) {
    console.error('Error al crear categoría:', error.message);
    res.status(500).json({ error: 'No se pudo crear la categoría.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// READ: muestra todos los productos activos.
app.get('/api/productos', async (_req, res) => {
  try {
    const [productos] = await db.query(`${selectProductos} WHERE p.activo = 1 ORDER BY p.id DESC`);
    res.json(productos.map(normalizarProducto));
  } catch (error) {
    console.error('Error al consultar productos:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar los productos.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// READ: muestra un producto específico por su id.
app.get('/api/productos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID del producto no es válido.' });
  try {
    const [[producto]] = await db.query(`${selectProductos} WHERE p.id = ? AND p.activo = 1`, [id]);
    if (!producto) return res.status(404).json({ error: 'No se encontró el producto.' });
    res.json(normalizarProducto(producto));
  } catch (error) {
    console.error('Error al consultar producto:', error.message);
    res.status(500).json({ error: 'No se pudo consultar el producto.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// CREATE: guarda un producto nuevo. La categoría debe existir previamente en MySQL.
app.post('/api/productos', async (req, res) => {
  if (!await verificarPermisoAdmin(req, 'gestionar_productos')) return res.status(403).json({ error: 'No tenés permiso para publicar productos.' });
  const errorValidacion = validarProducto(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });
  const { nombre, categoria, descripcion = '', precio, imagenUrl = '' } = req.body;
  const imagenes = obtenerImagenesEntrada(req.body);
  try {
    const categoriaExistente = await obtenerCategoriaExistente(categoria);
    if (!categoriaExistente) return res.status(400).json({ error: 'La categoría seleccionada no existe. Actualizá la lista y elegí una opción.' });

    const [resultado] = await db.query(
      'INSERT INTO productos (nombre, categoria_id, descripcion, precio, imagen_url, imagenes_json) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre.trim(), categoriaExistente.id, descripcion.trim() || null, Number(precio), (imagenes[0] || imagenUrl) || null, JSON.stringify(imagenes)]
    );
    const [[producto]] = await db.query(`${selectProductos} WHERE p.id = ?`, [resultado.insertId]);
    res.status(201).json(normalizarProducto(producto));
  } catch (error) {
    console.error('Error al crear producto:', error.message);
    res.status(500).json({ error: 'No se pudo publicar el producto.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// UPDATE: cambia los datos de un producto existente.
app.put('/api/productos/:id', async (req, res) => {
  if (!await verificarPermisoAdmin(req, 'gestionar_productos')) return res.status(403).json({ error: 'No tenés permiso para editar productos.' });
  const id = Number(req.params.id);
  const errorValidacion = validarProducto(req.body);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID del producto no es válido.' });
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const { nombre, categoria, descripcion = '', precio, imagenUrl = '' } = req.body;
  const imagenes = obtenerImagenesEntrada(req.body);
  try {
    const [[existente]] = await db.query('SELECT id FROM productos WHERE id = ? AND activo = 1', [id]);
    if (!existente) return res.status(404).json({ error: 'No se encontró un producto activo con ese ID.' });

    const categoriaExistente = await obtenerCategoriaExistente(categoria);
    if (!categoriaExistente) return res.status(400).json({ error: 'La categoría seleccionada no existe.' });

    await db.query(
      `UPDATE productos
       SET nombre = ?, categoria_id = ?, descripcion = ?, precio = ?, imagen_url = ?, imagenes_json = ?
       WHERE id = ? AND activo = 1`,
      [nombre.trim(), categoriaExistente.id, descripcion.trim() || null, Number(precio), (imagenes[0] || imagenUrl) || null, JSON.stringify(imagenes), id]
    );
    const [[producto]] = await db.query(`${selectProductos} WHERE p.id = ? AND p.activo = 1`, [id]);
    res.json(normalizarProducto(producto));
  } catch (error) {
    console.error('Error al actualizar producto:', error.message);
    res.status(500).json({ error: 'No se pudo actualizar el producto.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// DELETE: realiza una baja lógica para no romper las ventas que ya existen.
app.delete('/api/productos/:id', async (req, res) => {
  if (!await verificarPermisoAdmin(req, 'gestionar_productos')) return res.status(403).json({ error: 'No tenés permiso para quitar productos.' });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID del producto no es válido.' });
  try {
    const [resultado] = await db.query('UPDATE productos SET activo = 0 WHERE id = ? AND activo = 1', [id]);
    if (!resultado.affectedRows) return res.status(404).json({ error: 'El producto no existe o ya fue eliminado.' });
    res.json({ ok: true, id, mensaje: 'Producto eliminado del catálogo.' });
  } catch (error) {
    console.error('Error al eliminar producto:', error.message);
    res.status(500).json({ error: 'No se pudo eliminar el producto.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Sube un buffer validado a ImgBB y devuelve las URLs recibidas.
async function subirBufferAImgBB(buffer) {
  const tipo = detectarImagen(buffer);
  if (!tipo) throw new Error('El archivo no contiene una imagen JPG, PNG, GIF, WEBP o BMP válida.');
  const clave = process.env.IMGBB_API_KEY;
  if (!clave || clave === 'PEGAR_AQUI_LA_CLAVE_DE_IMGBB' || clave === 'colocar_la_clave_privada_de_imgbb') {
    const error = new Error('Falta configurar IMGBB_API_KEY en backend/.env.');
    error.status = 503;
    throw error;
  }
  const cuerpo = new URLSearchParams({ image: buffer.toString('base64') });
  const respuesta = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(clave)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: cuerpo.toString(),
    signal: AbortSignal.timeout(30000),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !datos.success || !datos.data?.url) {
    const detalle = datos?.error?.message || `ImgBB rechazó la imagen (HTTP ${respuesta.status}).`;
    const error = new Error(detalle);
    error.status = 502;
    throw error;
  }
  return { imagenUrl: datos.data.url, displayUrl: datos.data.display_url || datos.data.url };
}

// Sube una imagen a ImgBB usando la clave guardada en backend/.env. Acepta dos formas de envío:
//  - multipart/form-data con un archivo (Thunder Client). El nombre del campo puede ser cualquiera.
//  - JSON { "image": "<base64>" } (la app en Expo Go).
app.post(['/api/imagenes/producto', '/api/imagenes/perfil'], upload.any(), async (req, res) => {
  if (req.path.endsWith('/producto') && !await verificarPermisoAdmin(req, 'gestionar_productos')) return res.status(403).json({ error: 'No tenés permiso para subir imágenes de productos.' });
  if (req.path.endsWith('/perfil') && !leerSesion(req)) return res.status(401).json({ error: 'Iniciá sesión para subir tu foto de perfil.' });
  let buffer = req.files?.[0]?.buffer;
  if (!buffer) {
    const base64 = req.body?.image ?? req.body?.imagenBase64;
    if (typeof base64 === 'string' && base64.trim()) {
      buffer = Buffer.from(base64.trim().replace(/^data:[^;]+;base64,/, ''), 'base64');
    }
  }
  if (!buffer?.length) {
    return res.status(400).json({ error: 'No llegó ninguna imagen. En Thunder Client usá Body > Form y agregá un campo de tipo File.' });
  }
  if (buffer.length > MAX_IMAGEN) return res.status(413).json({ error: 'La imagen supera el límite de 5 MB.' });
  if (!detectarImagen(buffer)) {
    return res.status(400).json({ error: 'El archivo no es una imagen válida. Usá JPG, PNG, GIF, WEBP o BMP.' });
  }

  const clave = process.env.IMGBB_API_KEY;
  if (!clave || clave === 'PEGAR_AQUI_LA_CLAVE_DE_IMGBB' || clave === 'colocar_la_clave_privada_de_imgbb') {
    return res.status(503).json({ error: 'Falta configurar IMGBB_API_KEY en backend/.env.' });
  }

  try {
    const cuerpo = new URLSearchParams({ image: buffer.toString('base64') });
    const respuesta = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(clave)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: cuerpo.toString(),
      signal: AbortSignal.timeout(30000),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || !datos.success || !datos.data?.url) {
      console.error('ImgBB rechazó la imagen:', JSON.stringify(datos?.error || respuesta.status));
      return res.status(502).json({
        error: datos?.error?.message || `ImgBB rechazó la imagen (HTTP ${respuesta.status}). Revisá la clave y volvé a intentar.`,
      });
    }
    res.status(201).json({ imagenUrl: datos.data.url, displayUrl: datos.data.display_url || datos.data.url });
  } catch (error) {
    console.error('Error al subir a ImgBB:', error.message);
    const sinRed = error.name === 'TimeoutError' || error.cause?.code;
    res.status(502).json({
      error: sinRed
        ? 'El backend no pudo comunicarse con ImgBB (sin internet o tiempo agotado). Revisá la conexión de la computadora.'
        : `No se pudo completar la subida a ImgBB: ${error.message}`,
    });
  }
});

// BANNERS DEL INICIO: el cliente ve solo los activos; el administrador puede consultar todos.
const selectBanners = `
  SELECT id, titulo, imagen_url AS imagenUrl, orden, activo, creado_en AS creadoEn
  FROM banners
`;

app.get('/api/banners/admin', async (req, res) => {
  if (!await verificarPermisoAdmin(req, 'gestionar_banners')) return res.status(403).json({ error: 'No tenés permiso para administrar banners.' });
  try {
    const [banners] = await db.query(`${selectBanners} ORDER BY orden ASC, id DESC`);
    res.json(banners);
  } catch (error) {
    console.error('Error al consultar banners de administración:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar los banners. Revisá la migración de la tabla banners.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.get('/api/banners', async (_req, res) => {
  try {
    const [banners] = await db.query(`${selectBanners} WHERE activo = 1 ORDER BY orden ASC, id DESC`);
    res.json(banners);
  } catch (error) {
    console.error('Error al consultar banners:', error.message);
    res.status(500).json({ error: 'No se pudieron cargar los banners del inicio.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.post('/api/banners', async (req, res) => {
  if (!await verificarPermisoAdmin(req, 'gestionar_banners')) return res.status(403).json({ error: 'No tenés permiso para administrar banners.' });
  const titulo = String(req.body?.titulo || '').trim();
  const imagenUrl = String(req.body?.imagenUrl || '').trim();
  const ordenEnviado = req.body?.orden;
  if (!imagenUrl || !/^https?:\/\//i.test(imagenUrl)) {
    return res.status(400).json({ error: 'Subí una imagen a ImgBB y enviá su imagenUrl.' });
  }
  if (titulo.length > 120 || imagenUrl.length > 500) {
    return res.status(400).json({ error: 'El título o la dirección de imagen superan el largo permitido.' });
  }

  try {
    let orden;
    if (ordenEnviado === undefined || ordenEnviado === null || ordenEnviado === '') {
      const [[fila]] = await db.query('SELECT COALESCE(MAX(orden), -1) + 1 AS siguiente FROM banners');
      orden = Number(fila.siguiente);
    } else {
      orden = Number(ordenEnviado);
      if (!Number.isInteger(orden)) return res.status(400).json({ error: 'El orden debe ser un número entero.' });
    }

    const [resultado] = await db.query(
      'INSERT INTO banners (titulo, imagen_url, orden, activo) VALUES (?, ?, ?, 1)',
      [titulo || null, imagenUrl, orden]
    );
    const [[banner]] = await db.query(`${selectBanners} WHERE id = ?`, [resultado.insertId]);
    res.status(201).json(banner);
  } catch (error) {
    console.error('Error al crear banner:', error.message);
    res.status(500).json({ error: 'No se pudo guardar el banner.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.put('/api/banners/:id', async (req, res) => {
  if (!await verificarPermisoAdmin(req, 'gestionar_banners')) return res.status(403).json({ error: 'No tenés permiso para administrar banners.' });
  const id = Number(req.params.id);
  const titulo = String(req.body?.titulo || '').trim();
  const imagenUrl = String(req.body?.imagenUrl || '').trim();
  const orden = Number(req.body?.orden);
  const activo = req.body?.activo === false || Number(req.body?.activo) === 0 ? 0 : 1;

  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID del banner no es válido.' });
  if (!imagenUrl || !/^https?:\/\//i.test(imagenUrl)) return res.status(400).json({ error: 'La imagen del banner debe ser una URL HTTP o HTTPS.' });
  if (titulo.length > 120 || imagenUrl.length > 500) return res.status(400).json({ error: 'El título o la dirección de imagen superan el largo permitido.' });
  if (!Number.isInteger(orden)) return res.status(400).json({ error: 'El orden debe ser un número entero.' });

  try {
    const [[existente]] = await db.query('SELECT id FROM banners WHERE id = ?', [id]);
    if (!existente) return res.status(404).json({ error: 'No se encontró el banner.' });
    await db.query(
      'UPDATE banners SET titulo = ?, imagen_url = ?, orden = ?, activo = ? WHERE id = ?',
      [titulo || null, imagenUrl, orden, activo, id]
    );
    const [[banner]] = await db.query(`${selectBanners} WHERE id = ?`, [id]);
    res.json(banner);
  } catch (error) {
    console.error('Error al actualizar banner:', error.message);
    res.status(500).json({ error: 'No se pudo actualizar el banner.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Baja lógica: el banner deja de mostrarse en el inicio, pero se conserva su registro.
app.delete('/api/banners/:id', async (req, res) => {
  if (!await verificarPermisoAdmin(req, 'gestionar_banners')) return res.status(403).json({ error: 'No tenés permiso para administrar banners.' });
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID del banner no es válido.' });
  try {
    const [[existente]] = await db.query('SELECT id FROM banners WHERE id = ?', [id]);
    if (!existente) return res.status(404).json({ error: 'No se encontró el banner.' });
    await db.query('UPDATE banners SET activo = 0 WHERE id = ?', [id]);
    res.json({ ok: true, id, mensaje: 'Banner quitado del carrusel.' });
  } catch (error) {
    console.error('Error al eliminar banner:', error.message);
    res.status(500).json({ error: 'No se pudo quitar el banner.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Recibe base64 desde Expo, sube a ImgBB y guarda la URL en MySQL en una sola operación.
// Así evitamos que la imagen se suba correctamente pero la URL no quede asociada al usuario.
app.post('/api/usuarios/:id/foto-perfil', async (req, res) => {
  const id = Number(req.params.id);
  if (!verificarSesionPropia(req, id)) return res.status(401).json({ error: 'La sesión no corresponde a esta cuenta. Volvé a iniciar sesión.' });
  const base64 = String(req.body?.image || req.body?.imagenBase64 || '').trim();
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID de usuario no es válido.' });
  if (!base64) return res.status(400).json({ error: 'No llegó la imagen desde el celular. Volvé a elegirla e intentá otra vez.' });
  // Rechaza cargas excesivas antes de decodificar el base64.
  if (base64.length > Math.ceil(MAX_IMAGEN * 4 / 3) + 256) return res.status(413).json({ error: 'La foto de perfil supera el límite de 5 MB.' });
  const limpio = base64.replace(/^data:[^;]+;base64,/i, '').replace(/\s/g, '');
  const buffer = Buffer.from(limpio, 'base64');
  if (!buffer.length || buffer.length > MAX_IMAGEN) return res.status(413).json({ error: 'La foto está vacía o supera el límite de 5 MB.' });
  try {
    const [[existente]] = await db.query('SELECT id FROM usuarios WHERE id = ? AND activo = 1', [id]);
    if (!existente) return res.status(404).json({ error: 'No se encontró una cuenta activa para guardar la foto.' });
    const subida = await subirBufferAImgBB(buffer);
    await db.query('UPDATE usuarios SET foto_perfil_url = ? WHERE id = ? AND activo = 1', [subida.imagenUrl, id]);
    const [[usuario]] = await db.query(
      'SELECT id, nombre, email, telefono, foto_perfil_url AS fotoPerfilUrl, rol FROM usuarios WHERE id = ? AND activo = 1',
      [id]
    );
    return res.status(201).json({ ...usuario, telefono: usuario.telefono || '', fotoPerfilUrl: usuario.fotoPerfilUrl || '', imagenUrl: subida.imagenUrl, displayUrl: subida.displayUrl });
  } catch (error) {
    console.error('Error al subir/guardar foto de perfil:', { mensaje: error.message, codigo: error.code || null, detalle: error.sqlMessage || null });
    return res.status(error.status || 500).json({ error: error.message || 'No se pudo subir y guardar la foto de perfil. Revisá la conexión y la clave ImgBB.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Consulta solo los datos públicos del perfil; nunca devuelve hashes ni contraseñas.
app.get('/api/usuarios/:id/perfil', async (req, res) => {
  const id = Number(req.params.id);
  if (!verificarSesionPropia(req, id)) return res.status(401).json({ error: 'La sesión no corresponde a esta cuenta.' });
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID de usuario no es válido.' });
  try {
    const [[usuario]] = await db.query(
      'SELECT id, nombre, email, telefono, foto_perfil_url AS fotoPerfilUrl, rol FROM usuarios WHERE id = ? AND activo = 1',
      [id]
    );
    if (!usuario) return res.status(404).json({ error: 'No se encontró la cuenta.' });
    res.json({ ...usuario, telefono: usuario.telefono || '' });
  } catch (error) {
    console.error('Error al consultar el perfil:', error.message);
    res.status(500).json({ error: 'No se pudo consultar el perfil. Revisá que hayas ejecutado la migración.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Permite editar el nombre y el teléfono del perfil de una cuenta existente.
app.put('/api/usuarios/:id/perfil', async (req, res) => {
  const id = Number(req.params.id);
  if (!verificarSesionPropia(req, id)) return res.status(401).json({ error: 'La sesión no corresponde a esta cuenta.' });
  const nombre = String(req.body?.nombre || '').trim();
  const telefono = String(req.body?.telefono || '').trim();
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID de usuario no es válido.' });
  if (!nombre) return res.status(400).json({ error: 'El nombre no puede quedar vacío.' });
  if (nombre.length > 100 || telefono.length > 30) return res.status(400).json({ error: 'El nombre o teléfono superan el largo permitido.' });

  try {
    const [resultado] = await db.query(
      'UPDATE usuarios SET nombre = ?, telefono = ? WHERE id = ? AND activo = 1',
      [nombre, telefono || null, id]
    );
    if (!resultado.affectedRows) {
      const [[existente]] = await db.query('SELECT id FROM usuarios WHERE id = ? AND activo = 1', [id]);
      if (!existente) return res.status(404).json({ error: 'No se encontró la cuenta.' });
    }
    const [[usuario]] = await db.query(
      'SELECT id, nombre, email, telefono, foto_perfil_url AS fotoPerfilUrl, rol FROM usuarios WHERE id = ? AND activo = 1',
      [id]
    );
    res.json({ ...usuario, telefono: usuario.telefono || '' });
  } catch (error) {
    console.error('Error al actualizar el perfil:', error.message);
    res.status(500).json({ error: 'No se pudo actualizar el perfil. Revisá que hayas ejecutado la migración.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});


// Guarda en MySQL la URL de ImgBB asociada al perfil de la cuenta indicada.
app.put('/api/usuarios/:id/foto-perfil', async (req, res) => {
  const id = Number(req.params.id);
  if (!verificarSesionPropia(req, id)) return res.status(401).json({ error: 'La sesión no corresponde a esta cuenta.' });
  const imagenUrl = String(req.body?.imagenUrl || '').trim();
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID de usuario no es válido.' });
  if (imagenUrl.length > 1000 || !/^https:\/\//i.test(imagenUrl)) {
    return res.status(400).json({ error: 'La foto de perfil debe ser una URL HTTPS válida.' });
  }
  try {
    const [resultado] = await db.query(
      'UPDATE usuarios SET foto_perfil_url = ? WHERE id = ? AND activo = 1',
      [imagenUrl, id]
    );
    if (!resultado.affectedRows) {
      const [[existente]] = await db.query('SELECT id FROM usuarios WHERE id = ? AND activo = 1', [id]);
      if (!existente) return res.status(404).json({ error: 'No se encontró la cuenta.' });
    }
    const [[usuario]] = await db.query(
      'SELECT id, nombre, email, telefono, foto_perfil_url AS fotoPerfilUrl, rol FROM usuarios WHERE id = ? AND activo = 1',
      [id]
    );
    res.json({ ...usuario, telefono: usuario.telefono || '', fotoPerfilUrl: usuario.fotoPerfilUrl || '' });
  } catch (error) {
    console.error('Error al guardar foto de perfil:', error.message);
    res.status(500).json({ error: 'No se pudo guardar la foto de perfil. Ejecutá la migración de foto de perfil.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});


// PREFERENCIAS DE LA CUENTA: dirección, medio de pago preferido y notificaciones.
app.get('/api/usuarios/:id/preferencias', async (req, res) => {
  const id = Number(req.params.id);
  if (!verificarSesionPropia(req, id)) return res.status(401).json({ error: 'La sesión no corresponde a esta cuenta.' });
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID de usuario no es válido.' });
  try {
    const [[usuario]] = await db.query(
      `SELECT id, direccion_entrega AS direccion, localidad_entrega AS localidad,
              metodo_pago_preferido AS metodoPagoPreferido, notificaciones_activas AS notificacionesActivas
       FROM usuarios WHERE id = ? AND activo = 1`, [id]
    );
    if (!usuario) return res.status(404).json({ error: 'No se encontró la cuenta.' });
    res.json({
      ...usuario,
      direccion: usuario.direccion || '',
      localidad: usuario.localidad || '',
      metodoPagoPreferido: usuario.metodoPagoPreferido || '',
      notificacionesActivas: Boolean(Number(usuario.notificacionesActivas)),
    });
  } catch (error) {
    console.error('Error al consultar preferencias:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar las preferencias. Revisá la migración de configuración.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.put('/api/usuarios/:id/preferencias', async (req, res) => {
  const id = Number(req.params.id);
  if (!verificarSesionPropia(req, id)) return res.status(401).json({ error: 'La sesión no corresponde a esta cuenta.' });
  const direccion = String(req.body?.direccion || '').trim();
  const localidad = String(req.body?.localidad || '').trim();
  const metodoPagoPreferido = String(req.body?.metodoPagoPreferido || '').trim();
  const notificacionesActivas = req.body?.notificacionesActivas === false || Number(req.body?.notificacionesActivas) === 0 ? 0 : 1;
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID de usuario no es válido.' });
  if (direccion.length > 200 || localidad.length > 100) return res.status(400).json({ error: 'La dirección o localidad supera el largo permitido.' });
  if (metodoPagoPreferido && !METODOS_PAGO_VALIDOS.includes(metodoPagoPreferido)) return res.status(400).json({ error: 'El medio de pago preferido no es válido.' });
  try {
    if (metodoPagoPreferido) {
      const tienda = await obtenerConfiguracionTienda();
      if (!tienda.metodosPago[metodoPagoPreferido]) return res.status(400).json({ error: 'Ese medio de pago no está habilitado actualmente por la tienda.' });
    }
    const [resultado] = await db.query(
      `UPDATE usuarios SET direccion_entrega = ?, localidad_entrega = ?,
       metodo_pago_preferido = ?, notificaciones_activas = ? WHERE id = ? AND activo = 1`,
      [direccion || null, localidad || null, metodoPagoPreferido || null, notificacionesActivas, id]
    );
    if (!resultado.affectedRows) {
      const [[existe]] = await db.query('SELECT id FROM usuarios WHERE id = ? AND activo = 1', [id]);
      if (!existe) return res.status(404).json({ error: 'No se encontró la cuenta.' });
    }
    res.json({ ok: true, mensaje: 'Preferencias guardadas.' });
  } catch (error) {
    console.error('Error al guardar preferencias:', error.message);
    res.status(500).json({ error: 'No se pudieron guardar las preferencias. Revisá la migración de configuración.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Los cambios de correo/contraseña ahora requieren el flujo de protección de cuenta.
// Se conserva esta ruta antigua solo para devolver una indicación clara a clientes desactualizados.
app.post('/api/usuarios/:id/password', async (_req, res) => {
  res.status(410).json({ error: 'Esta ruta fue reemplazada. Usá Configuración > Privacidad y seguridad para verificar tu cuenta antes de cambiar la contraseña.' });
});

// Configuración pública de la tienda: medios de pago habilitados y datos para mostrar al cliente.
app.get('/api/configuracion-tienda', async (_req, res) => {
  try {
    res.json(await obtenerConfiguracionTienda());
  } catch (error) {
    console.error('Error al consultar configuración de tienda:', error.message);
    res.status(500).json({ error: 'No se pudo consultar la configuración de la tienda. Ejecutá la migración.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.put('/api/admin/configuracion-tienda', async (req, res) => {
  const adminId = Number(req.body?.adminId);
  if (!await verificarPermisoAdmin(req, 'configurar_tienda', adminId)) return res.status(403).json({ error: 'Se requiere una cuenta administradora activa.' });
  const b = req.body || {};
  const datos = {
    nombre: String(b.nombre || '').trim(), telefono: String(b.telefono || '').trim(), email: String(b.email || '').trim(),
    direccion: String(b.direccion || '').trim(), localidad: String(b.localidad || '').trim(),
    descripcion: String(b.descripcion || '').trim(), horario: String(b.horario || '').trim(),
    condiciones: String(b.condicionesVenta || '').trim(),
    envio: b.envioHabilitado === false || Number(b.envioHabilitado) === 0 ? 0 : 1,
    costo: Number(b.costoEnvioBase || 0),
    credito: b.metodosPago?.credito === false ? 0 : 1,
    debito: b.metodosPago?.debito === false ? 0 : 1,
    rapipago: b.metodosPago?.rapipago === false ? 0 : 1,
  };
  if (!datos.nombre || datos.nombre.length > 120 || datos.telefono.length > 30 || datos.email.length > 150 || datos.direccion.length > 200 || datos.localidad.length > 100 || datos.descripcion.length > 500 || datos.horario.length > 120 || datos.condiciones.length > 1000 || !Number.isFinite(datos.costo) || datos.costo < 0) {
    return res.status(400).json({ error: 'Revisá los datos de la tienda y el costo de envío.' });
  }
  if (!datos.credito && !datos.debito && !datos.rapipago) return res.status(400).json({ error: 'Debe quedar habilitado al menos un medio de pago.' });
  try {
    await db.query(
      `INSERT INTO configuracion_tienda
       (id, nombre, telefono, email, direccion, localidad, descripcion, horario, condiciones_venta,
        envio_habilitado, costo_envio_base, pago_credito_activo, pago_debito_activo, pago_rapipago_activo)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE nombre=VALUES(nombre), telefono=VALUES(telefono), email=VALUES(email),
        direccion=VALUES(direccion), localidad=VALUES(localidad), descripcion=VALUES(descripcion), horario=VALUES(horario),
        condiciones_venta=VALUES(condiciones_venta), envio_habilitado=VALUES(envio_habilitado), costo_envio_base=VALUES(costo_envio_base),
        pago_credito_activo=VALUES(pago_credito_activo), pago_debito_activo=VALUES(pago_debito_activo), pago_rapipago_activo=VALUES(pago_rapipago_activo)`,
      [datos.nombre, datos.telefono || null, datos.email || null, datos.direccion || null, datos.localidad || null,
       datos.descripcion || null, datos.horario || null, datos.condiciones || null, datos.envio, datos.costo,
       datos.credito, datos.debito, datos.rapipago]
    );
    res.json({ ok: true, configuracion: await obtenerConfiguracionTienda() });
  } catch (error) {
    console.error('Error al guardar configuración de tienda:', error.message);
    res.status(500).json({ error: 'No se pudo guardar la configuración de la tienda.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Administración de cuentas: la cuenta principal ve a todos; los empleados solo ven los grupos delegados.
app.get('/api/admin/usuarios', async (req, res) => {
  const puedeClientes = await verificarPermisoAdmin(req, 'gestionar_usuarios', req.query.adminId);
  const puedeEmpleados = await verificarPermisoAdmin(req, 'gestionar_empleados', req.query.adminId);
  const esPrincipal = await verificarPropietario(req);
  if (!esPrincipal && !puedeClientes && !puedeEmpleados) return res.status(403).json({ error: 'No tenés permiso para consultar cuentas.' });
  try {
    let consulta;
    if (esPrincipal) {
      consulta = `SELECT id, nombre, email, telefono, rol, activo, creado_en AS creadoEn FROM usuarios ORDER BY creado_en DESC, id DESC`;
    } else if (puedeClientes && puedeEmpleados) {
      consulta = `SELECT id, nombre, email, telefono, rol, activo, creado_en AS creadoEn FROM usuarios
                  WHERE rol = 'cliente' OR (rol = 'admin' AND NOT EXISTS (SELECT 1 FROM propietario_sistema ps WHERE ps.usuario_id = usuarios.id))
                  ORDER BY creado_en DESC, id DESC`;
    } else if (puedeEmpleados) {
      consulta = `SELECT id, nombre, email, telefono, rol, activo, creado_en AS creadoEn FROM usuarios
                  WHERE rol = 'admin' AND NOT EXISTS (SELECT 1 FROM propietario_sistema ps WHERE ps.usuario_id = usuarios.id)
                  ORDER BY creado_en DESC, id DESC`;
    } else {
      consulta = `SELECT id, nombre, email, telefono, rol, activo, creado_en AS creadoEn FROM usuarios WHERE rol = 'cliente' ORDER BY creado_en DESC, id DESC`;
    }
    const [usuarios] = await db.query(consulta);
    res.json(usuarios);
  } catch (error) {
    console.error('Error al listar usuarios:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar los usuarios.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.patch('/api/admin/usuarios/:id/estado', async (req, res) => {
  const adminId = Number(req.body?.adminId);
  const id = Number(req.params.id);
  const puedeClientes = await verificarPermisoAdmin(req, 'gestionar_usuarios', adminId);
  const puedeEmpleados = await verificarPermisoAdmin(req, 'gestionar_empleados', adminId);
  const esPrincipal = await verificarPropietario(req);
  if (!esPrincipal && !puedeClientes && !puedeEmpleados) return res.status(403).json({ error: 'No tenés permiso para administrar cuentas.' });
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID de usuario no es válido.' });
  const activo = req.body?.activo === true || Number(req.body?.activo) === 1 ? 1 : 0;
  if (id === adminId && !activo) return res.status(400).json({ error: 'No podés desactivar tu propia cuenta.' });
  try {
    const [[actual]] = await db.query('SELECT u.rol, EXISTS(SELECT 1 FROM propietario_sistema ps WHERE ps.usuario_id = u.id) AS esPropietario FROM usuarios u WHERE u.id = ? LIMIT 1', [id]);
    if (!actual) return res.status(404).json({ error: 'No se encontró la cuenta.' });
    if (Number(actual.esPropietario) === 1) return res.status(403).json({ error: 'La cuenta principal no se puede deshabilitar desde la aplicación.' });
    if (actual.rol === 'admin' && !esPrincipal && !puedeEmpleados) return res.status(403).json({ error: 'Solo la cuenta principal o un empleado autorizado para gestionar empleados puede modificar otra cuenta administradora.' });
    if (actual.rol === 'cliente' && !esPrincipal && !puedeClientes) return res.status(403).json({ error: 'No tenés permiso para modificar cuentas de clientes.' });
    const [resultado] = await db.query('UPDATE usuarios SET activo = ? WHERE id = ?', [activo, id]);
    if (!resultado.affectedRows) return res.status(404).json({ error: 'No se encontró la cuenta.' });
    if (!activo) revocarSesionesUsuario(id);
    res.json({ ok: true, id, activo: Boolean(activo) });
  } catch (error) {
    console.error('Error al cambiar estado de usuario:', error.message);
    res.status(500).json({ error: 'No se pudo modificar el estado de la cuenta.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Devuelve un pedido solo cuando coinciden el ID del usuario y el ID del pedido.
app.get('/api/usuarios/:id/pedidos/:pedidoId', async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!verificarSesionPropia(req, usuarioId)) return res.status(401).json({ error: 'La sesión no corresponde a esta cuenta.' });
  const pedidoId = Number(req.params.pedidoId);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0 || !Number.isInteger(pedidoId) || pedidoId <= 0) {
    return res.status(400).json({ error: 'El ID de usuario o de pedido no es válido.' });
  }
  try {
    const [[pedido]] = await db.query(
      `SELECT v.id, v.id AS pedidoId, v.usuario_id AS usuarioId, v.numero, v.fecha,
              v.subtotal, v.descuento, v.costo_envio AS costoEnvio, v.total,
              v.metodo_pago AS metodoPago, v.estado, v.estado_pedido AS estadoPedido,
              v.codigo_rapipago AS codigoRapipago, v.con_envio AS conEnvio,
              v.direccion_envio AS direccion, v.localidad_envio AS localidad,
              v.distancia_km AS distanciaKm
       FROM ventas v WHERE v.usuario_id = ? AND v.id = ? LIMIT 1`,
      [usuarioId, pedidoId]
    );
    if (!pedido) return res.status(404).json({ error: 'No se encontró ese pedido dentro de tu cuenta.' });
    const [items] = await db.query(
      `SELECT dv.producto_id AS id, p.nombre, dv.cantidad, dv.precio_unitario AS precio
       FROM detalle_ventas dv INNER JOIN productos p ON p.id = dv.producto_id
       WHERE dv.venta_id = ? ORDER BY dv.id`, [pedidoId]
    );
    pedido.items = items.map((item) => ({ ...item, cantidad: Number(item.cantidad), precio: Number(item.precio) }));
    pedido.total = Number(pedido.total);
    pedido.subtotal = Number(pedido.subtotal);
    pedido.descuento = Number(pedido.descuento);
    pedido.costoEnvio = Number(pedido.costoEnvio);
    pedido.inicio = pedido.fecha ? new Date(pedido.fecha).getTime() : Date.now();
    pedido.numero = pedido.numero || pedido.id;
    pedido.estado = pedido.estadoPedido || pedido.estado;
    pedido.conEnvio = Boolean(Number(pedido.conEnvio));
    res.json(pedido);
  } catch (error) {
    console.error('Error al consultar el pedido individual:', error.message);
    res.status(500).json({ error: 'No se pudo consultar el pedido.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// El usuario consulta sus compras: el historial ahora se conserva en MySQL y no solamente en el celular.
app.get('/api/usuarios/:id/pedidos', async (req, res) => {
  const id = Number(req.params.id);
  if (!verificarSesionPropia(req, id)) return res.status(401).json({ error: 'La sesión no corresponde a esta cuenta.' });
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID de usuario no es válido.' });
  try {
    const [[preferenciasUsuario]] = await db.query(
      'SELECT notificaciones_activas FROM usuarios WHERE id = ? AND activo = 1', [id]
    );
    if (!preferenciasUsuario) return res.status(404).json({ error: 'No se encontró la cuenta.' });
    const [ventas] = await db.query(
      `SELECT id, id AS pedidoId, usuario_id AS usuarioId, numero, fecha, subtotal, descuento, costo_envio, total, metodo_pago AS metodoPago,
              estado, estado_pedido AS estadoPedido, codigo_rapipago AS codigoRapipago,
              con_envio AS conEnvio, direccion_envio AS direccion, localidad_envio AS localidad, distancia_km AS distanciaKm
       FROM ventas WHERE usuario_id = ? ORDER BY fecha DESC, id DESC`, [id]
    );
    for (const venta of ventas) {
      venta.notificacionesActivas = Boolean(Number(preferenciasUsuario.notificaciones_activas));
      const [items] = await db.query(
        `SELECT dv.producto_id AS id, p.nombre, dv.cantidad, dv.precio_unitario AS precio
         FROM detalle_ventas dv INNER JOIN productos p ON p.id = dv.producto_id WHERE dv.venta_id = ?`, [venta.id]
      );
      venta.items = items;
      venta.total = Number(venta.total);
      venta.subtotal = Number(venta.subtotal);
      venta.descuento = Number(venta.descuento);
      venta.costo_envio = Number(venta.costo_envio);
      venta.distanciaKm = venta.distanciaKm == null ? null : Number(venta.distanciaKm);
      venta.inicio = new Date(venta.fecha).getTime();
      venta.numero = venta.numero || venta.id;
      venta.estado = venta.estadoPedido;
      venta.conEnvio = Boolean(Number(venta.conEnvio));
    }
    res.json(ventas);
  } catch (error) {
    console.error('Error al consultar pedidos:', error.message);
    res.status(500).json({ error: 'No se pudo consultar el historial de pedidos.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Confirma una compra y la guarda en ventas + detalle_ventas dentro de una transacción.
// Los precios se leen nuevamente desde MySQL para que el total no dependa del celular.
app.post('/api/ventas', async (req, res) => {
  const usuarioId = Number(req.body?.usuarioId);
  if (!verificarSesionPropia(req, usuarioId)) return res.status(401).json({ error: 'La sesión no corresponde a la cuenta que intenta comprar.' });
  const metodoPago = String(req.body?.metodoPago || '');
  const conEnvio = Boolean(req.body?.conEnvio);
  const direccion = String(req.body?.direccion || '').trim();
  const localidad = String(req.body?.localidad || '').trim();
  const distanciaKm = req.body?.distanciaKm == null ? null : Number(req.body.distanciaKm);
  const costoEnvioSolicitado = Number(req.body?.costoEnvio || 0);
  const codigoRapipago = String(req.body?.codigoRapipago || '').trim();
  const codigoCupon = String(req.body?.codigoCupon || '').trim().toUpperCase();
  const itemsEntrada = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!Number.isInteger(usuarioId) || usuarioId <= 0 || !METODOS_PAGO_VALIDOS.includes(metodoPago) || itemsEntrada.length < 1 || itemsEntrada.length > 40) {
    return res.status(400).json({ error: 'Faltan datos de la compra o no son válidos.' });
  }
  if (conEnvio && (!direccion || !localidad || direccion.length > 200 || localidad.length > 100 || !Number.isFinite(distanciaKm) || distanciaKm < 0)) {
    return res.status(400).json({ error: 'Completá una dirección, localidad y distancia de envío válidas.' });
  }
  if (!Number.isFinite(costoEnvioSolicitado) || costoEnvioSolicitado < 0 || costoEnvioSolicitado > 100000) return res.status(400).json({ error: 'El costo de envío no es válido.' });
  let conexion;
  try {
    const [[usuario]] = await db.query('SELECT id FROM usuarios WHERE id = ? AND activo = 1', [usuarioId]);
    if (!usuario) return res.status(404).json({ error: 'La cuenta no existe o está desactivada.' });
    const tienda = await obtenerConfiguracionTienda();
    if (!tienda.metodosPago[metodoPago]) return res.status(400).json({ error: 'Ese medio de pago no está habilitado por la tienda.' });
    if (conEnvio && !tienda.envioHabilitado) return res.status(400).json({ error: 'La tienda no tiene habilitados los envíos a domicilio.' });

    // Si un cliente envía el mismo producto en dos líneas, unificamos cantidades antes de validar stock.
    const cantidadesPorProducto = new Map();
    for (const item of itemsEntrada) {
      const productoId = Number(item.id);
      const cantidad = Number(item.cantidad);
      if (!Number.isInteger(productoId) || productoId <= 0 || !Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 100) {
        return res.status(400).json({ error: 'Uno de los productos o cantidades no es válido.' });
      }
      cantidadesPorProducto.set(productoId, (cantidadesPorProducto.get(productoId) || 0) + cantidad);
    }
    for (const cantidad of cantidadesPorProducto.values()) {
      if (cantidad > 100) return res.status(400).json({ error: 'La cantidad total de un producto no puede superar 100 unidades por compra.' });
    }

    conexion = await db.getConnection();
    await conexion.beginTransaction();
    let subtotal = 0;
    const detalle = [];
    for (const [productoId, cantidad] of cantidadesPorProducto) {
      const [[producto]] = await conexion.query('SELECT id, nombre, precio, stock_disponible AS stockDisponible FROM productos WHERE id = ? AND activo = 1 FOR UPDATE', [productoId]);
      if (!producto) throw new Error(`El producto ${productoId} ya no está disponible.`);
      const stockDisponible = Number(producto.stockDisponible || 0);
      if (stockDisponible < cantidad) {
        const error = new Error(`No hay stock suficiente de ${producto.nombre}. Disponibles: ${stockDisponible}.`);
        error.status = 409;
        throw error;
      }
      const precio = Number(producto.precio);
      subtotal += precio * cantidad;
      detalle.push({ id: producto.id, nombre: producto.nombre, cantidad, precio });
    }

    let cuponId = null;
    let descuento = 0;
    let envio = conEnvio ? costoEnvioSolicitado : 0;
    if (codigoCupon) {
      const [[cupon]] = await conexion.query(
        `SELECT id, tipo, valor FROM cupones
         WHERE codigo = ? AND activo = 1 AND (vence_en IS NULL OR vence_en >= CURDATE()) LIMIT 1`, [codigoCupon]
      );
      if (!cupon) throw new Error('El cupón no existe, está desactivado o venció.');
      cuponId = cupon.id;
      if (cupon.tipo === 'porcentaje') descuento = Math.round(subtotal * Number(cupon.valor) / 100);
      else if (cupon.tipo === 'monto') descuento = Math.min(Number(cupon.valor), subtotal);
      else if (cupon.tipo === 'envioGratis') {
        if (!conEnvio) throw new Error('El cupón de envío gratis requiere envío a domicilio.');
        envio = 0;
      }
    }
    const total = Math.max(0, subtotal - descuento + envio);
    const estadoPago = metodoPago === 'rapipago' ? 'pendiente' : 'pagada';
    const numero = `DL-${Date.now().toString().slice(-12)}`;
    const [resultado] = await conexion.query(
      `INSERT INTO ventas
       (numero, usuario_id, cupon_id, subtotal, descuento, costo_envio, total, metodo_pago, estado, estado_pedido,
        codigo_rapipago, con_envio, direccion_envio, localidad_envio, distancia_km)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmado', ?, ?, ?, ?, ?)`,
      [numero, usuarioId, cuponId, subtotal, descuento, envio, total, metodoPago, estadoPago,
       codigoRapipago || null, conEnvio ? 1 : 0, conEnvio ? direccion : null, conEnvio ? localidad : null, conEnvio ? distanciaKm : null]
    );
    for (const item of detalle) {
      await conexion.query(
        'INSERT INTO detalle_ventas (venta_id, producto_id, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
        [resultado.insertId, item.id, item.cantidad, item.precio]
      );
      await conexion.query('UPDATE productos SET stock_disponible = stock_disponible - ? WHERE id = ?', [item.cantidad, item.id]);
    }
    await conexion.commit();
    res.status(201).json({
      id: resultado.insertId, pedidoId: resultado.insertId, usuarioId, numero, inicio: Date.now(), subtotal, descuento, costoEnvio: envio, total,
      metodoPago, estado: 'confirmado', estadoPedido: 'confirmado', estadoPago, codigoRapipago: codigoRapipago || null,
      conEnvio, direccion: conEnvio ? direccion : null, localidad: conEnvio ? localidad : null,
      distanciaKm: conEnvio ? distanciaKm : null, items: detalle,
    });
  } catch (error) {
    if (conexion) await conexion.rollback().catch(() => {});
    console.error('Error al registrar venta:', error.code || '', error.message);
    res.status(error.status || (error.code ? 500 : 400)).json({
      error: error.code ? 'No se pudo guardar la compra en MySQL. Revisá que estén aplicadas las migraciones de pedidos y configuraciones.' : (error.message || 'No se pudo registrar la compra.'),
    });
  } finally {
    conexion?.release();
  }
});

// Administración de pedidos/ventas y cambio del estado logístico.
app.get('/api/admin/ventas', async (req, res) => {
  if (!await verificarPermisoAdmin(req, 'gestionar_pedidos', req.query.adminId)) return res.status(403).json({ error: 'Se requiere una cuenta administradora activa.' });
  try {
    const [ventas] = await db.query(
      `SELECT v.id, v.numero, v.fecha, v.usuario_id AS usuarioId, u.nombre AS nombreUsuario, u.email,
              v.subtotal, v.descuento, v.costo_envio AS costoEnvio, v.total, v.metodo_pago AS metodoPago,
              v.estado AS estadoPago, v.estado_pedido AS estadoPedido, v.codigo_rapipago AS codigoRapipago,
              v.con_envio AS conEnvio, v.direccion_envio AS direccion, v.localidad_envio AS localidad
       FROM ventas v INNER JOIN usuarios u ON u.id = v.usuario_id ORDER BY v.fecha DESC, v.id DESC LIMIT 300`
    );
    for (const venta of ventas) {
      const [items] = await db.query(
        `SELECT dv.producto_id AS id, p.nombre, dv.cantidad, dv.precio_unitario AS precio
         FROM detalle_ventas dv INNER JOIN productos p ON p.id = dv.producto_id WHERE dv.venta_id = ?`, [venta.id]
      );
      venta.items = items;
      venta.total = Number(venta.total);
      venta.conEnvio = Boolean(Number(venta.conEnvio));
    }
    res.json(ventas);
  } catch (error) {
    console.error('Error al listar ventas:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar los pedidos y ventas.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.patch('/api/admin/ventas/:id/estado', async (req, res) => {
  const id = Number(req.params.id);
  const adminId = Number(req.body?.adminId);
  const estadoPedido = String(req.body?.estadoPedido || '');
  if (!await verificarPermisoAdmin(req, 'gestionar_pedidos', adminId)) return res.status(403).json({ error: 'Se requiere una cuenta administradora activa.' });
  if (!Number.isInteger(id) || id <= 0 || !ESTADOS_PEDIDO_VALIDOS.includes(estadoPedido)) return res.status(400).json({ error: 'El pedido o estado no es válido.' });
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();
    const [[venta]] = await conexion.query('SELECT id, estado_pedido AS estadoPedido FROM ventas WHERE id = ? FOR UPDATE', [id]);
    if (!venta) { await conexion.rollback(); return res.status(404).json({ error: 'No se encontró el pedido.' }); }
    if (venta.estadoPedido === 'cancelado') { await conexion.rollback(); return res.status(409).json({ error: 'El pedido ya está cancelado y no se puede reactivar.' }); }
    if (venta.estadoPedido === 'entregado' && estadoPedido !== 'entregado') { await conexion.rollback(); return res.status(409).json({ error: 'Un pedido entregado no se puede cambiar ni cancelar desde esta pantalla.' }); }
    if (estadoPedido === 'cancelado') {
      const [items] = await conexion.query('SELECT producto_id, cantidad FROM detalle_ventas WHERE venta_id = ?', [id]);
      for (const item of items) {
        await conexion.query('UPDATE productos SET stock_disponible = stock_disponible + ? WHERE id = ?', [Number(item.cantidad), item.producto_id]);
      }
      await conexion.query("UPDATE ventas SET estado_pedido = ?, estado = 'cancelada' WHERE id = ?", [estadoPedido, id]);
    } else {
      await conexion.query('UPDATE ventas SET estado_pedido = ? WHERE id = ?', [estadoPedido, id]);
    }
    await conexion.commit();
    res.json({ ok: true, id, estadoPedido, stockReintegrado: estadoPedido === 'cancelado' });
  } catch (error) {
    await conexion.rollback().catch(() => {});
    console.error('Error al actualizar estado del pedido:', error.message);
    res.status(500).json({ error: 'No se pudo actualizar el estado del pedido.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  } finally { conexion.release(); }
});

// Indicadores operativos basados exclusivamente en las ventas guardadas en MySQL.
app.get('/api/admin/reportes', async (req, res) => {
  if (!await verificarPermisoAdmin(req, 'ver_reportes', req.query.adminId)) return res.status(403).json({ error: 'Se requiere una cuenta administradora activa.' });
  try {
    const [[resumen]] = await db.query(
      `SELECT COUNT(*) AS cantidadPedidos, COALESCE(SUM(CASE WHEN estado = 'pagada' THEN total ELSE 0 END), 0) AS totalVendido,
              COALESCE(SUM(CASE WHEN estado_pedido NOT IN ('entregado','cancelado') THEN 1 ELSE 0 END), 0) AS pedidosAbiertos,
              COUNT(DISTINCT usuario_id) AS clientes
       FROM ventas`
    );
    const [[productos]] = await db.query('SELECT COUNT(*) AS productosActivos FROM productos WHERE activo = 1');
    const [estados] = await db.query('SELECT estado_pedido AS estado, COUNT(*) AS cantidad FROM ventas GROUP BY estado_pedido ORDER BY cantidad DESC');
    const [masVendidos] = await db.query(
      `SELECT p.nombre, SUM(dv.cantidad) AS unidades, SUM(dv.cantidad * dv.precio_unitario) AS importe
       FROM detalle_ventas dv INNER JOIN productos p ON p.id = dv.producto_id
       INNER JOIN ventas v ON v.id = dv.venta_id WHERE v.estado <> 'cancelada'
       GROUP BY p.id, p.nombre ORDER BY unidades DESC LIMIT 5`
    );
    res.json({
      cantidadPedidos: Number(resumen.cantidadPedidos), totalVendido: Number(resumen.totalVendido),
      pedidosAbiertos: Number(resumen.pedidosAbiertos), clientes: Number(resumen.clientes),
      productosActivos: Number(productos.productosActivos), estados, masVendidos,
    });
  } catch (error) {
    console.error('Error al generar reportes:', error.message);
    res.status(500).json({ error: 'No se pudieron generar los reportes.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// STOCK DE PRODUCTOS TERMINADOS, PROVEEDORES Y PEDIDOS DE REPOSICIÓN.
function fechaMasDias(dias) {
  const fecha = new Date();
  fecha.setHours(12, 0, 0, 0);
  fecha.setDate(fecha.getDate() + Math.max(0, Number(dias) || 0));
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function fechaComoSQL(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) {
    return `${valor.getFullYear()}-${String(valor.getMonth() + 1).padStart(2, '0')}-${String(valor.getDate()).padStart(2, '0')}`;
  }
  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(texto)) return texto.slice(0, 10);
  const fecha = new Date(texto);
  if (Number.isNaN(fecha.getTime())) return null;
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function diasHastaFecha(fecha) {
  if (!fecha) return 7;
  const objetivo = new Date(`${fechaComoSQL(fecha) || fecha}T12:00:00`);
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  return Math.max(0, Math.ceil((objetivo - hoy) / 86400000));
}

async function calcularReposicionProducto(productoId) {
  const [[producto]] = await db.query(
    `SELECT p.id, p.nombre, p.stock_disponible AS stockDisponible,
            p.dias_reposicion_estimados AS diasReposicionEstimados,
            p.proveedor_id AS proveedorId, pr.nombre AS proveedorNombre,
            pr.plazo_entrega_dias AS plazoProveedor
     FROM productos p LEFT JOIN proveedores pr ON pr.id = p.proveedor_id
     WHERE p.id = ? AND p.activo = 1 LIMIT 1`, [productoId]
  );
  if (!producto) return null;
  const [[pedidoAbierto]] = await db.query(
    `SELECT pp.fecha_estimada_recepcion AS fechaEstimada
     FROM pedidos_proveedor pp
     INNER JOIN detalle_pedidos_proveedor dp ON dp.pedido_proveedor_id = pp.id
     WHERE dp.producto_id = ? AND pp.estado IN ('solicitado','confirmado','en_camino')
       AND pp.fecha_estimada_recepcion IS NOT NULL
     ORDER BY pp.fecha_estimada_recepcion ASC LIMIT 1`, [productoId]
  );
  const dias = pedidoAbierto?.fechaEstimada
    ? diasHastaFecha(pedidoAbierto.fechaEstimada)
    : Number(producto.plazoProveedor || producto.diasReposicionEstimados || 7);
  return {
    ...producto,
    diasEstimados: dias,
    fechaEstimada: pedidoAbierto?.fechaEstimada
      ? fechaComoSQL(pedidoAbierto.fechaEstimada)
      : fechaMasDias(dias),
    proveedorNombre: producto.proveedorNombre || null,
  };
}

app.get('/api/productos/:id/disponibilidad', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID del producto no es válido.' });
  try {
    const dato = await calcularReposicionProducto(id);
    if (!dato) return res.status(404).json({ error: 'No se encontró el producto.' });
    res.json({ productoId: id, stockDisponible: Number(dato.stockDisponible || 0), agotado: Number(dato.stockDisponible || 0) <= 0, proveedor: dato.proveedorNombre, diasEstimados: dato.diasEstimados, fechaEstimada: dato.fechaEstimada });
  } catch (error) {
    console.error('Error al consultar disponibilidad:', error.message);
    res.status(500).json({ error: 'No se pudo consultar la disponibilidad.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.get('/api/admin/abastecimiento', async (req, res) => {
  const adminId = req.query.adminId;
  const puedeStock = await verificarPermisoAdmin(req, 'gestionar_insumos', adminId);
  const puedePedidos = await verificarPermisoAdmin(req, 'solicitar_compras', adminId);
  const puedeProductos = await verificarPermisoAdmin(req, 'gestionar_productos', adminId);
  if (!puedeStock && !puedePedidos && !puedeProductos) return res.status(403).json({ error: 'No tenés permiso para consultar stock, productos o reposiciones.' });
  try {
    const [productos] = await db.query(`${selectProductos} WHERE p.activo = 1 ORDER BY c.nombre, p.nombre`);
    const [proveedores] = await db.query('SELECT id, nombre, contacto, telefono, email, localidad, plazo_entrega_dias AS plazoEntregaDias, activo FROM proveedores WHERE activo = 1 ORDER BY nombre');
    const [pedidos] = await db.query(`SELECT pp.id, pp.numero, pp.tipo, pp.estado, pp.proveedor_id AS proveedorId, pp.fecha_estimada_recepcion AS fechaEstimada,
      pp.notas, pp.creado_en AS creadoEn, pr.nombre AS proveedor
      FROM pedidos_proveedor pp INNER JOIN proveedores pr ON pr.id = pp.proveedor_id
      ORDER BY CASE WHEN pp.estado IN ('solicitado', 'confirmado', 'en_camino') THEN 0 ELSE 1 END, pp.creado_en DESC, pp.id DESC LIMIT 100`);
    for (const pedido of pedidos) {
      const [items] = await db.query(`SELECT dp.producto_id AS productoId, p.nombre, dp.cantidad_solicitada AS cantidad,
        dp.cantidad_recibida AS cantidadRecibida FROM detalle_pedidos_proveedor dp
        INNER JOIN productos p ON p.id = dp.producto_id WHERE dp.pedido_proveedor_id = ? ORDER BY p.nombre`, [pedido.id]);
      pedido.items = items.map((item) => ({ ...item, cantidad: Number(item.cantidad), cantidadRecibida: Number(item.cantidadRecibida) }));
    }
    const [anticipados] = await db.query(`SELECT pa.id, pa.numero, pa.usuario_id AS usuarioId, u.nombre AS cliente,
      pa.producto_id AS productoId, p.nombre AS producto, pa.cantidad, pa.fecha_deseada AS fechaDeseada,
      pa.modalidad_entrega AS modalidadEntrega, pa.direccion, pa.localidad, pa.metodo_pago AS metodoPago,
      pa.fecha_estimada_reposicion AS fechaEstimada, pa.plazo_estimado_dias AS plazoEstimadoDias,
      pa.estado, pa.creado_en AS creadoEn
      FROM pedidos_anticipados pa INNER JOIN usuarios u ON u.id = pa.usuario_id
      INNER JOIN productos p ON p.id = pa.producto_id ORDER BY pa.creado_en DESC LIMIT 80`);
    res.json({
      productos: productos.map(normalizarProducto), proveedores,
      pedidos: pedidos.map((p) => ({ ...p, fechaEstimada: fechaComoSQL(p.fechaEstimada) })),
      anticipados: anticipados.map((p) => ({ ...p, fechaDeseada: fechaComoSQL(p.fechaDeseada), fechaEstimada: fechaComoSQL(p.fechaEstimada) })),
    });
  } catch (error) {
    console.error('Error al consultar abastecimiento:', error.message);
    res.status(500).json({ error: 'No se pudo consultar stock y proveedores. Aplicá la migración de stock y proveedores.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Solo el propietario registra proveedores. El personal autorizado puede elegirlos para solicitar reposiciones.
app.post('/api/admin/proveedores', async (req, res) => {
  if (!await verificarPropietario(req)) return res.status(403).json({ error: 'Solo la cuenta propietaria puede agregar proveedores.' });
  const nombre = String(req.body?.nombre || '').trim();
  const contacto = String(req.body?.contacto || '').trim();
  const telefono = String(req.body?.telefono || '').trim();
  const email = String(req.body?.email || '').trim();
  const localidad = String(req.body?.localidad || '').trim();
  const plazo = Number(req.body?.plazoEntregaDias || 7);
  if (!nombre || nombre.length > 150 || contacto.length > 120 || telefono.length > 30 || email.length > 150 || localidad.length > 100 || !Number.isInteger(plazo) || plazo < 1 || plazo > 120) {
    return res.status(400).json({ error: 'Revisá el nombre, contacto y plazo de entrega (1 a 120 días).' });
  }
  try {
    const [resultado] = await db.query(`INSERT INTO proveedores (nombre, contacto, telefono, email, localidad, plazo_entrega_dias)
      VALUES (?, ?, ?, ?, ?, ?)`, [nombre, contacto || null, telefono || null, email || null, localidad || null, plazo]);
    res.status(201).json({ id: resultado.insertId, nombre, contacto, telefono, email, localidad, plazoEntregaDias: plazo, activo: 1 });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe un proveedor con ese nombre.' });
    console.error('Error al crear proveedor:', error.message);
    res.status(500).json({ error: 'No se pudo guardar el proveedor.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.put('/api/admin/proveedores/:id', async (req, res) => {
  if (!await verificarPropietario(req)) return res.status(403).json({ error: 'Solo la cuenta propietaria puede modificar proveedores.' });
  const id = Number(req.params.id);
  const nombre = String(req.body?.nombre || '').trim();
  const plazo = Number(req.body?.plazoEntregaDias || 7);
  if (!Number.isInteger(id) || id <= 0 || !nombre || nombre.length > 150 || !Number.isInteger(plazo) || plazo < 1 || plazo > 120) return res.status(400).json({ error: 'Los datos del proveedor no son válidos.' });
  try {
    await db.query(`UPDATE proveedores SET nombre = ?, contacto = ?, telefono = ?, email = ?, localidad = ?, plazo_entrega_dias = ?, activo = ? WHERE id = ?`,
      [nombre, String(req.body?.contacto || '').trim() || null, String(req.body?.telefono || '').trim() || null, String(req.body?.email || '').trim() || null, String(req.body?.localidad || '').trim() || null, plazo, req.body?.activo === false ? 0 : 1, id]);
    res.json({ ok: true, id });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ya existe otro proveedor con ese nombre.' });
    res.status(500).json({ error: 'No se pudo actualizar el proveedor.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.patch('/api/admin/productos/:id/stock', async (req, res) => {
  const adminId = Number(req.body?.adminId);
  if (!await verificarPermisoAdmin(req, 'gestionar_insumos', adminId)) return res.status(403).json({ error: 'No tenés permiso para configurar la reposición.' });
  const id = Number(req.params.id);

  // Esta ruta solo configura avisos y proveedor. Nunca modifica las unidades disponibles.
  const camposProhibidos = ['stockDisponible', 'stock_disponible', 'unidadesAgregar', 'cantidadAgregar', 'cantidadRecibida', 'unidades', 'stock'];
  if (camposProhibidos.some((campo) => Object.prototype.hasOwnProperty.call(req.body || {}, campo))) {
    return res.status(400).json({ error: 'El stock no se puede modificar manualmente. Las unidades se suman únicamente al recibir un pedido de proveedor.' });
  }

  const minimo = Number(req.body?.stockMinimo ?? 0);
  const dias = Number(req.body?.diasReposicionEstimados ?? 7);
  const proveedorId = req.body?.proveedorId == null || req.body?.proveedorId === '' ? null : Number(req.body.proveedorId);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(minimo) || minimo < 0
    || !Number.isInteger(dias) || dias < 1 || dias > 120
    || (proveedorId !== null && (!Number.isInteger(proveedorId) || proveedorId <= 0))) {
    return res.status(400).json({ error: 'El stock mínimo debe ser un entero no negativo, el plazo debe estar entre 1 y 120 días y el proveedor debe ser válido.' });
  }
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();
    if (proveedorId !== null) {
      const [[proveedor]] = await conexion.query('SELECT id FROM proveedores WHERE id = ? AND activo = 1', [proveedorId]);
      if (!proveedor) { await conexion.rollback(); return res.status(400).json({ error: 'El proveedor seleccionado no existe o está inactivo.' }); }
    }
    const [resultado] = await conexion.query(`UPDATE productos
      SET stock_minimo = ?, proveedor_id = ?, dias_reposicion_estimados = ?
      WHERE id = ? AND activo = 1`, [minimo, proveedorId, dias, id]);
    if (!resultado.affectedRows) { await conexion.rollback(); return res.status(404).json({ error: 'No se encontró el producto.' }); }
    const [[fila]] = await conexion.query('SELECT stock_disponible AS stockDisponible, stock_minimo AS stockMinimo FROM productos WHERE id = ?', [id]);
    await conexion.commit();
    res.json({
      ok: true,
      id,
      stockDisponible: Number(fila.stockDisponible),
      stockMinimo: Number(fila.stockMinimo),
      mensaje: 'Configuración guardada. El stock solo cambia con ventas y recepciones de proveedores.',
    });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al guardar configuración de reposición:', error.message);
    res.status(500).json({ error: 'No se pudo guardar la configuración de reposición.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  } finally {
    conexion.release();
  }
});

app.patch('/api/admin/productos/:id/destacado', async (req, res) => {
  const adminId = Number(req.body?.adminId);
  if (!await verificarPermisoAdmin(req, 'gestionar_productos', adminId)) return res.status(403).json({ error: 'No tenés permiso para elegir los productos destacados.' });
  const id = Number(req.params.id);
  const destacado = Boolean(req.body?.destacado);
  const orden = Number(req.body?.orden || 0);
  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(orden) || orden < 0) return res.status(400).json({ error: 'El producto o el orden no son válidos.' });
  try {
    const [r] = await db.query('UPDATE productos SET destacado_dia = ?, destacado_orden = ? WHERE id = ? AND activo = 1', [destacado ? 1 : 0, orden, id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'No se encontró el producto.' });
    res.json({ ok: true, id, destacadoDia: destacado, destacadoOrden: orden });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar el destacado del día.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.post('/api/admin/pedidos-proveedor', async (req, res) => {
  const adminId = Number(req.body?.adminId);
  if (!await verificarPermisoAdmin(req, 'solicitar_compras', adminId)) return res.status(403).json({ error: 'No tenés permiso para solicitar reposiciones a proveedores.' });
  const proveedorId = Number(req.body?.proveedorId);
  const tipo = req.body?.tipo === 'pedido_grande' ? 'pedido_grande' : 'reposicion';
  const fechaEstimada = String(req.body?.fechaEstimadaRecepcion || '').trim();
  const notas = String(req.body?.notas || '').trim();
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (!Number.isInteger(proveedorId) || proveedorId <= 0 || items.length < 1 || items.length > 50 || notas.length > 500 || (fechaEstimada && !/^\d{4}-\d{2}-\d{2}$/.test(fechaEstimada))) return res.status(400).json({ error: 'Elegí proveedor, fecha estimada válida y al menos un producto.' });
  const agregados = new Map();
  for (const item of items) {
    const productoId = Number(item.productoId);
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(productoId) || productoId <= 0 || !Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 100000) return res.status(400).json({ error: 'Cada producto debe tener una cantidad entera mayor a cero.' });
    agregados.set(productoId, (agregados.get(productoId) || 0) + cantidad);
  }
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();
    const [[proveedor]] = await conexion.query('SELECT id FROM proveedores WHERE id = ? AND activo = 1', [proveedorId]);
    if (!proveedor) { await conexion.rollback(); return res.status(404).json({ error: 'El proveedor no existe o está inactivo.' }); }
    for (const productoId of agregados.keys()) {
      const [[producto]] = await conexion.query('SELECT id FROM productos WHERE id = ? AND activo = 1', [productoId]);
      if (!producto) throw new Error(`No existe el producto ID ${productoId}.`);
    }
    const numero = `PR-${Date.now().toString().slice(-12)}`;
    const [cabecera] = await conexion.query(`INSERT INTO pedidos_proveedor (numero, proveedor_id, tipo, estado, fecha_estimada_recepcion, notas, creado_por_usuario_id)
      VALUES (?, ?, ?, 'solicitado', ?, ?, ?)`, [numero, proveedorId, tipo, fechaEstimada || null, notas || null, adminId]);
    for (const [productoId, cantidad] of agregados) await conexion.query('INSERT INTO detalle_pedidos_proveedor (pedido_proveedor_id, producto_id, cantidad_solicitada) VALUES (?, ?, ?)', [cabecera.insertId, productoId, cantidad]);
    if (fechaEstimada) for (const productoId of agregados.keys()) await conexion.query(`UPDATE pedidos_anticipados SET fecha_estimada_reposicion = ?, plazo_estimado_dias = ?, estado = 'pendiente_reposicion' WHERE producto_id = ? AND estado = 'pendiente_reposicion'`, [fechaEstimada, diasHastaFecha(fechaEstimada), productoId]);
    await conexion.commit();
    res.status(201).json({ ok: true, id: cabecera.insertId, numero, estado: 'solicitado', tipo, fechaEstimadaRecepcion: fechaEstimada || null });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al crear pedido a proveedor:', error.message);
    res.status(500).json({ error: error.message || 'No se pudo registrar el pedido al proveedor.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  } finally { conexion.release(); }
});

app.patch('/api/admin/pedidos-proveedor/:id/estado', async (req, res) => {
  const adminId = Number(req.body?.adminId);
  if (!await verificarPermisoAdmin(req, 'solicitar_compras', adminId)) return res.status(403).json({ error: 'No tenés permiso para actualizar pedidos a proveedores.' });
  const id = Number(req.params.id);
  const estado = String(req.body?.estado || '');
  if (!Number.isInteger(id) || id <= 0 || !['confirmado', 'en_camino', 'recibido', 'cancelado'].includes(estado)) return res.status(400).json({ error: 'El pedido o estado no son válidos.' });
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();
    const [[pedido]] = await conexion.query('SELECT id, estado FROM pedidos_proveedor WHERE id = ? FOR UPDATE', [id]);
    if (!pedido) { await conexion.rollback(); return res.status(404).json({ error: 'No se encontró el pedido al proveedor.' }); }
    if (pedido.estado === 'recibido' || pedido.estado === 'cancelado') { await conexion.rollback(); return res.status(409).json({ error: `El pedido ya está ${pedido.estado}.` }); }
    if (estado === 'recibido') {
      const [items] = await conexion.query('SELECT producto_id, cantidad_solicitada FROM detalle_pedidos_proveedor WHERE pedido_proveedor_id = ?', [id]);
      for (const item of items) {
        await conexion.query('UPDATE productos SET stock_disponible = stock_disponible + ? WHERE id = ?', [Number(item.cantidad_solicitada), item.producto_id]);
        await conexion.query(`UPDATE pedidos_anticipados SET estado = 'producto_disponible' WHERE producto_id = ? AND estado = 'pendiente_reposicion'`, [item.producto_id]);
        await conexion.query('UPDATE detalle_pedidos_proveedor SET cantidad_recibida = cantidad_solicitada WHERE pedido_proveedor_id = ? AND producto_id = ?', [id, item.producto_id]);
      }
    }
    await conexion.query('UPDATE pedidos_proveedor SET estado = ?, recibido_en = IF(? = \'recibido\', NOW(), recibido_en) WHERE id = ?', [estado, estado, id]);
    await conexion.commit();
    res.json({ ok: true, id, estado, stockActualizado: estado === 'recibido' });
  } catch (error) {
    await conexion.rollback();
    console.error('Error al actualizar pedido a proveedor:', error.message);
    res.status(500).json({ error: 'No se pudo actualizar el pedido al proveedor.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  } finally { conexion.release(); }
});

// Pedidos anticipados: el cliente reserva una cantidad cuando el producto está agotado.
app.post('/api/pedidos-anticipados', async (req, res) => {
  const usuarioId = Number(req.body?.usuarioId);
  const productoId = Number(req.body?.productoId);
  const cantidad = Number(req.body?.cantidad);
  const fechaDeseada = String(req.body?.fechaDeseada || '').trim();
  const modalidad = req.body?.modalidadEntrega === 'envio' ? 'envio' : 'retiro';
  const direccion = String(req.body?.direccion || '').trim();
  const localidad = String(req.body?.localidad || '').trim();
  const metodoPago = String(req.body?.metodoPago || '');
  const notas = String(req.body?.notas || '').trim();
  if (!verificarSesionPropia(req, usuarioId)) return res.status(401).json({ error: 'Iniciá sesión para realizar un pedido anticipado.' });
  if (!Number.isInteger(productoId) || productoId <= 0 || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 100 || !/^\d{4}-\d{2}-\d{2}$/.test(fechaDeseada) || !METODOS_PAGO_VALIDOS.includes(metodoPago) || notas.length > 500) return res.status(400).json({ error: 'Completá producto, cantidad, fecha y medio de pago válidos.' });
  if (modalidad === 'envio' && (!direccion || !localidad || direccion.length > 200 || localidad.length > 100)) return res.status(400).json({ error: 'Completá la dirección y localidad para el envío.' });
  try {
    const [[usuario]] = await db.query('SELECT id FROM usuarios WHERE id = ? AND activo = 1', [usuarioId]);
    if (!usuario) return res.status(404).json({ error: 'La cuenta no existe o está inactiva.' });
    const disponibilidad = await calcularReposicionProducto(productoId);
    if (!disponibilidad) return res.status(404).json({ error: 'El producto ya no está disponible.' });
    if (Number(disponibilidad.stockDisponible) > 0) return res.status(409).json({ error: 'El producto volvió a tener stock. Podés agregarlo al carrito y comprarlo normalmente.' });
    const tienda = await obtenerConfiguracionTienda();
    if (!tienda.metodosPago[metodoPago]) return res.status(400).json({ error: 'Ese medio de pago no está habilitado por la tienda.' });
    if (modalidad === 'envio' && !tienda.envioHabilitado) return res.status(400).json({ error: 'La tienda no tiene habilitado el envío a domicilio.' });
    const numero = `ESP-${Date.now().toString().slice(-12)}`;
    const [r] = await db.query(`INSERT INTO pedidos_anticipados (numero, usuario_id, producto_id, cantidad, fecha_deseada,
      modalidad_entrega, direccion, localidad, metodo_pago, fecha_estimada_reposicion, plazo_estimado_dias, estado, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente_reposicion', ?)`,
      [numero, usuarioId, productoId, cantidad, fechaDeseada, modalidad, modalidad === 'envio' ? direccion : null,
       modalidad === 'envio' ? localidad : null, metodoPago, disponibilidad.fechaEstimada, disponibilidad.diasEstimados, notas || null]);
    res.status(201).json({ ok: true, id: r.insertId, numero, usuarioId, productoId, cantidad, estado: 'pendiente_reposicion', fechaEstimada: disponibilidad.fechaEstimada, diasEstimados: disponibilidad.diasEstimados, proveedor: disponibilidad.proveedorNombre });
  } catch (error) {
    console.error('Error al registrar pedido anticipado:', error.message);
    res.status(500).json({ error: 'No se pudo registrar el pedido anticipado.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.get('/api/usuarios/:id/pedidos-anticipados', async (req, res) => {
  const usuarioId = Number(req.params.id);
  if (!await exigirSesionUsuario(req, res, usuarioId)) return;
  try {
    const [lista] = await db.query(`SELECT pa.id, pa.numero, pa.usuario_id AS usuarioId, pa.producto_id AS productoId,
      p.nombre AS producto, pa.cantidad, pa.fecha_deseada AS fechaDeseada, pa.modalidad_entrega AS modalidadEntrega,
      pa.direccion, pa.localidad, pa.metodo_pago AS metodoPago, pa.fecha_estimada_reposicion AS fechaEstimada,
      pa.plazo_estimado_dias AS plazoEstimadoDias, pa.estado, pa.creado_en AS creadoEn
      FROM pedidos_anticipados pa INNER JOIN productos p ON p.id = pa.producto_id
      WHERE pa.usuario_id = ? ORDER BY pa.creado_en DESC`, [usuarioId]);
    res.json(lista.map((p) => ({ ...p, fechaDeseada: fechaComoSQL(p.fechaDeseada), fechaEstimada: fechaComoSQL(p.fechaEstimada) })));
  } catch (error) {
    res.status(500).json({ error: 'No se pudieron consultar tus pedidos anticipados.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.patch('/api/admin/pedidos-anticipados/:id/estado', async (req, res) => {
  const adminId = Number(req.body?.adminId);
  if (!await verificarPermisoAdmin(req, 'gestionar_pedidos', adminId)) return res.status(403).json({ error: 'No tenés permiso para actualizar pedidos anticipados.' });
  const id = Number(req.params.id);
  const estado = String(req.body?.estado || '');
  if (!Number.isInteger(id) || id <= 0 || !['confirmado', 'cancelado'].includes(estado)) return res.status(400).json({ error: 'El ID o estado no son válidos.' });
  const conexion = await db.getConnection();
  try {
    await conexion.beginTransaction();
    const [[pedido]] = await conexion.query('SELECT id, producto_id AS productoId, cantidad, estado FROM pedidos_anticipados WHERE id = ? FOR UPDATE', [id]);
    if (!pedido) { await conexion.rollback(); return res.status(404).json({ error: 'No se encontró el pedido anticipado.' }); }
    if (!['pendiente_reposicion', 'producto_disponible'].includes(pedido.estado)) {
      await conexion.rollback();
      return res.status(409).json({ error: `El pedido ya está ${pedido.estado} y no se puede modificar.` });
    }
    if (estado === 'confirmado') {
      if (pedido.estado !== 'producto_disponible') {
        await conexion.rollback();
        return res.status(409).json({ error: 'Todavía no se recibió la reposición. No se puede confirmar este pedido.' });
      }
      const [[producto]] = await conexion.query('SELECT stock_disponible AS stockDisponible, nombre FROM productos WHERE id = ? AND activo = 1 FOR UPDATE', [pedido.productoId]);
      if (!producto) { await conexion.rollback(); return res.status(404).json({ error: 'El producto ya no está disponible.' }); }
      if (Number(producto.stockDisponible || 0) < Number(pedido.cantidad)) {
        await conexion.rollback();
        return res.status(409).json({ error: `No hay unidades suficientes para confirmar. Disponibles: ${Number(producto.stockDisponible || 0)}.` });
      }
      await conexion.query('UPDATE productos SET stock_disponible = stock_disponible - ? WHERE id = ?', [Number(pedido.cantidad), pedido.productoId]);
    }
    await conexion.query('UPDATE pedidos_anticipados SET estado = ? WHERE id = ?', [estado, id]);
    await conexion.commit();
    res.json({ ok: true, id, estado, stockReservado: estado === 'confirmado' });
  } catch (error) {
    await conexion.rollback().catch(() => {});
    console.error('Error al actualizar pedido anticipado:', error.message);
    res.status(500).json({ error: 'No se pudo actualizar el pedido anticipado.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  } finally { conexion.release(); }
});

// Las rutas de inventario de materias primas fueron retiradas. El stock se administra por producto terminado.

// Registro de cuentas.
app.post('/api/auth/registro', async (req, res) => {
  const cuerpo = req.body && typeof req.body === 'object' ? req.body : {};
  const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
  const mail = typeof cuerpo.email === 'string' ? cuerpo.email.trim().toLowerCase() : '';
  const telefono = typeof cuerpo.telefono === 'string' ? cuerpo.telefono.trim() : '';
  const password = typeof cuerpo.password === 'string' ? cuerpo.password : '';
  const rol = typeof cuerpo.rol === 'string' ? cuerpo.rol.trim().toLowerCase() : 'cliente';
  const codigoAutorizacion = typeof cuerpo.codigoAutorizacion === 'string'
    ? cuerpo.codigoAutorizacion.trim()
    : '';
  const claveUnica = typeof cuerpo.claveUnica === 'string' ? cuerpo.claveUnica.trim() : '';

  if (!nombre || nombre.length > 100 || !/^\S+@\S+\.\S+$/.test(mail) || mail.length > 150 || password.length < 6 || telefono.length > 30) {
    return res.status(400).json({ error: 'Revisá nombre, correo, teléfono y contraseña (mínimo 6 caracteres).' });
  }
  if (!['cliente', 'admin'].includes(rol)) {
    return res.status(400).json({ error: 'El tipo de cuenta seleccionado no es válido.' });
  }
  if (rol === 'admin' && (
    !process.env.ADMIN_REGISTRATION_CODE ||
    codigoAutorizacion !== process.env.ADMIN_REGISTRATION_CODE.trim() ||
    !/^\d{6}$/.test(claveUnica)
  )) {
    return res.status(403).json({ error: 'Datos de administrador inválidos. Revisá el código de autorización y la clave de seis números.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const claveUnicaHash = rol === 'admin' ? await bcrypt.hash(claveUnica, 12) : null;
    const [resultado] = await db.query(
      'INSERT INTO usuarios (nombre, email, telefono, password_hash, rol, clave_unica_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre, mail, telefono || null, passwordHash, rol, claveUnicaHash]
    );
    console.log(`Cuenta creada correctamente: usuario ID ${resultado.insertId} (${rol}).`);
    return res.status(201).json({ id: resultado.insertId, nombre, email: mail, telefono, fotoPerfilUrl: '', rol });
  } catch (error) {
    console.error('Error al registrar usuario:', {
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage || error.message,
    });

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
    }

    let mensaje = 'No se pudo crear la cuenta. Revisá la terminal del backend para ver el error.';
    if (error.code === 'ER_NO_SUCH_TABLE') {
      mensaje = 'No existe la tabla usuarios en la base de datos configurada. Verificá DB_NAME y la importación del SQL.';
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      mensaje = 'A la tabla usuarios le falta una columna necesaria. Ejecutá la migración de perfil y banners.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      mensaje = 'El backend no puede conectarse con MySQL. Revisá XAMPP y backend/.env.';
    }
    return res.status(500).json({
      error: mensaje,
      detalle: process.env.NODE_ENV === 'production' ? undefined : (error.sqlMessage || error.message),
    });
  }
});

// Verifica la identidad antes de permitir cambiar correo o contraseña.
// Los clientes confirman su contraseña actual; los administradores también ingresan
// el código general de administración y su clave personal de seis números.
app.post('/api/auth/verificar-proteccion-cuenta', async (req, res) => {
  const id = Number(req.body?.usuarioId);
  if (!verificarSesionPropia(req, id)) return res.status(401).json({ error: 'La sesión no corresponde a esta cuenta.' });
  const passwordActual = String(req.body?.passwordActual || '');
  const codigoAdmin = String(req.body?.codigoAdmin || '').trim();
  const claveUnica = String(req.body?.claveUnica || '').trim();
  if (!Number.isInteger(id) || id <= 0 || !passwordActual) {
    return res.status(400).json({ error: 'Ingresá tu contraseña actual para continuar.' });
  }
  const llaveIntentos = `${req.ip || 'local'}:${id}`;
  const estadoIntentos = intentosProteccionCuenta.get(llaveIntentos);
  if (estadoIntentos?.bloqueadoHasta > Date.now()) {
    const faltan = Math.ceil((estadoIntentos.bloqueadoHasta - Date.now()) / 60000);
    return res.status(429).json({ error: `Por seguridad, esperá aproximadamente ${faltan} minuto(s) antes de volver a intentar.` });
  }
  try {
    const [[usuario]] = await db.query(
      'SELECT id, rol, password_hash, clave_unica_hash, activo FROM usuarios WHERE id = ? AND activo = 1 LIMIT 1', [id]
    );
    let correcto = Boolean(usuario && await bcrypt.compare(passwordActual, usuario.password_hash));
    if (correcto && usuario.rol === 'admin') {
      const codigoConfigurado = String(process.env.ADMIN_REGISTRATION_CODE || '').trim();
      correcto = Boolean(codigoConfigurado && codigoAdmin === codigoConfigurado && /^\d{6}$/.test(claveUnica)
        && usuario.clave_unica_hash && await bcrypt.compare(claveUnica, usuario.clave_unica_hash));
    }
    if (!correcto) {
      const intentos = (estadoIntentos?.cantidad || 0) + 1;
      intentosProteccionCuenta.set(llaveIntentos, {
        cantidad: intentos,
        bloqueadoHasta: intentos >= 5 ? Date.now() + 10 * 60 * 1000 : 0,
      });
      return res.status(401).json({ error: usuario?.rol === 'admin'
        ? 'No se pudo verificar la cuenta. Revisá la contraseña, el código de administración y tu clave personal.'
        : 'La contraseña actual es incorrecta.' });
    }
    intentosProteccionCuenta.delete(llaveIntentos);
    const ahora = Date.now();
    for (const [tokenExistente, datos] of tokensProteccionCuenta) {
      if (datos.expira <= ahora) tokensProteccionCuenta.delete(tokenExistente);
    }
    const token = randomBytes(32).toString('hex');
    tokensProteccionCuenta.set(token, { usuarioId: id, expira: ahora + 5 * 60 * 1000 });
    return res.json({ ok: true, token, venceEnSegundos: 300, mensaje: 'Identidad verificada. Podés modificar el correo o la contraseña durante los próximos 5 minutos.' });
  } catch (error) {
    console.error('Error en la protección de cuenta:', error.message);
    return res.status(500).json({ error: 'No se pudo verificar la cuenta.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Actualiza correo y/o contraseña usando un token temporal emitido por la protección de cuenta.
app.put('/api/usuarios/:id/credenciales', async (req, res) => {
  const id = Number(req.params.id);
  if (!verificarSesionPropia(req, id)) return res.status(401).json({ error: 'La sesión no corresponde a esta cuenta.' });
  const token = String(req.headers['x-proteccion-cuenta'] || req.body?.tokenProteccion || '').trim();
  const nuevoEmail = String(req.body?.nuevoEmail || '').trim().toLowerCase();
  const nuevaPassword = String(req.body?.nuevaPassword || '');
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID de usuario no es válido.' });
  if (!token) return res.status(401).json({ error: 'Falta la verificación de seguridad. Volvé a validar tu identidad.' });
  const permiso = tokensProteccionCuenta.get(token);
  if (!permiso || permiso.usuarioId !== id || permiso.expira <= Date.now()) {
    tokensProteccionCuenta.delete(token);
    return res.status(401).json({ error: 'La verificación venció o ya fue utilizada. Volvé a verificar tu identidad.' });
  }
  if (!nuevoEmail && !nuevaPassword) return res.status(400).json({ error: 'Ingresá un correo nuevo, una contraseña nueva o ambos.' });
  if (nuevoEmail && (!/^\S+@\S+\.\S+$/.test(nuevoEmail) || nuevoEmail.length > 150)) {
    return res.status(400).json({ error: 'Ingresá un correo electrónico válido de hasta 150 caracteres.' });
  }
  if (nuevaPassword && (nuevaPassword.length < 6 || nuevaPassword.length > 100)) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener entre 6 y 100 caracteres.' });
  }
  try {
    const [[usuario]] = await db.query('SELECT id, email FROM usuarios WHERE id = ? AND activo = 1', [id]);
    if (!usuario) return res.status(404).json({ error: 'No se encontró una cuenta activa.' });
    const cambios = [];
    const valores = [];
    if (nuevoEmail && nuevoEmail !== String(usuario.email || '').toLowerCase()) {
      cambios.push('email = ?'); valores.push(nuevoEmail);
    }
    if (nuevaPassword) {
      cambios.push('password_hash = ?'); valores.push(await bcrypt.hash(nuevaPassword, 12));
    }
    if (!cambios.length) return res.status(400).json({ error: 'El nuevo correo coincide con el actual y no ingresaste otra modificación.' });
    valores.push(id);
    await db.query(`UPDATE usuarios SET ${cambios.join(', ')} WHERE id = ? AND activo = 1`, valores);
    const [[actualizado]] = await db.query('SELECT id, nombre, email, telefono, foto_perfil_url AS fotoPerfilUrl, rol FROM usuarios WHERE id = ?', [id]);
    tokensProteccionCuenta.delete(token); // El permiso se consume al completar el cambio.
    return res.json({ ok: true, usuario: { ...actualizado, telefono: actualizado.telefono || '', fotoPerfilUrl: actualizado.fotoPerfilUrl || '' }, mensaje: 'Los datos de acceso se actualizaron correctamente.' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Ese correo ya está asociado a otra cuenta.' });
    console.error('Error al actualizar credenciales:', error.message);
    return res.status(500).json({ error: 'No se pudieron actualizar los datos de acceso.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Inicio de sesión. El token se emite para clientes; los administradores completan la segunda verificación.
app.post('/api/auth/login', async (req, res) => {
  try {
    const [[usuario]] = await db.query('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [req.body.email?.trim().toLowerCase()]);
    if (!usuario || !await bcrypt.compare(req.body.password || '', usuario.password_hash)) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }
    const datos = await cargarDatosSesion(usuario.id);
    if (usuario.rol === 'admin') {
      console.log(`[AUTH] Contraseña de administrador validada. Falta la clave personal para usuario ID ${usuario.id}.`);
      return res.status(200).json({ ...datos, requiereClave: true });
    }
    const sessionToken = crearTokenSesion(usuario.id);
    return res.json({ ...datos, sessionToken, requiereClave: false });
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    res.status(500).json({ error: 'No se pudo iniciar sesión. Verificá que esté aplicada la migración de administración principal.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Verificación adicional para administradores: solo después de la clave personal se habilita la sesión.
app.post('/api/auth/verificar-admin', async (req, res) => {
  try {
    const [[usuario]] = await db.query('SELECT * FROM usuarios WHERE id = ? AND activo = 1', [req.body.usuarioId]);
    if (!usuario || usuario.rol !== 'admin' || !await bcrypt.compare(req.body.clave || '', usuario.clave_unica_hash || '')) {
      return res.status(401).json({ error: 'La clave única es incorrecta.' });
    }
    const datos = await cargarDatosSesion(usuario.id);
    if (!datos) {
      console.warn(`[AUTH] Admin ID ${usuario.id}: la cuenta no pudo cargarse después de validar su clave.`);
      return res.status(401).json({ error: 'La cuenta no está disponible para iniciar sesión.' });
    }

    // La app espera exactamente la propiedad sessionToken para habilitar la sesión.
    const sessionToken = crearTokenSesion(usuario.id);
    console.log(`[AUTH] Verificación de administrador correcta. Sesión segura emitida para usuario ID ${usuario.id}.`);
    return res.status(200).json({ ...datos, sessionToken, requiereClave: false });
  } catch (error) {
    console.error('Error al verificar administrador:', error.message);
    res.status(500).json({ error: 'No se pudo verificar el administrador.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Solo la cuenta propietaria puede consultar empleados y delegar permisos.
app.get('/api/owner/empleados', async (req, res) => {
  if (!await verificarPropietario(req)) return res.status(403).json({ error: 'Esta función está reservada a la cuenta principal de Dulces Lucho.' });
  try {
    const [empleados] = await db.query(
      `SELECT u.id, u.nombre, u.email, u.activo, u.permisos_admin_json AS permisosAdminJson,
              ps.usuario_id IS NOT NULL AS esPropietario
       FROM usuarios u LEFT JOIN propietario_sistema ps ON ps.usuario_id = u.id
       WHERE u.rol = 'admin' ORDER BY u.id ASC`
    );
    res.json(empleados.filter((e) => !Number(e.esPropietario)).map((e) => ({
      id: e.id, nombre: e.nombre, email: e.email, activo: Boolean(Number(e.activo)),
      permisos: parsearPermisos(e.permisosAdminJson),
    })));
  } catch (error) {
    console.error('Error al listar empleados:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar los empleados.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

app.put('/api/owner/empleados/:id/permisos', async (req, res) => {
  if (!await verificarPropietario(req)) return res.status(403).json({ error: 'Solo la cuenta principal puede asignar permisos.' });
  const id = Number(req.params.id);
  const permisos = req.body?.permisos;
  const permitidos = new Set(PERMISOS_ADMIN.map((p) => p.codigo));
  if (!Number.isInteger(id) || id <= 0 || !Array.isArray(permisos) || permisos.some((p) => !permitidos.has(p))) {
    return res.status(400).json({ error: 'El empleado o la lista de permisos no es válida.' });
  }
  try {
    const [[empleado]] = await db.query("SELECT id FROM usuarios WHERE id = ? AND rol = 'admin' AND activo = 1 AND NOT EXISTS (SELECT 1 FROM propietario_sistema ps WHERE ps.usuario_id = usuarios.id)", [id]);
    if (!empleado) return res.status(404).json({ error: 'No se encontró un empleado administrador activo.' });
    await db.query('UPDATE usuarios SET permisos_admin_json = ? WHERE id = ?', [JSON.stringify([...new Set(permisos)]), id]);
    res.json({ ok: true, id, permisos: [...new Set(permisos)] });
  } catch (error) {
    console.error('Error al asignar permisos:', error.message);
    res.status(500).json({ error: 'No se pudieron guardar los permisos.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Baja lógica exclusiva de la cuenta propietaria: conserva facturas y trazabilidad de compras anteriores.
app.delete('/api/owner/usuarios/:id', async (req, res) => {
  if (!await verificarPropietario(req)) return res.status(403).json({ error: 'Solo la cuenta principal puede dar de baja usuarios.' });
  const id = Number(req.params.id);
  const sesion = leerSesion(req);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID no es válido.' });
  if (id === sesion.usuarioId) return res.status(400).json({ error: 'No podés dar de baja la cuenta principal desde la aplicación.' });
  try {
    const [[cuenta]] = await db.query('SELECT id FROM usuarios WHERE id = ? AND NOT EXISTS (SELECT 1 FROM propietario_sistema ps WHERE ps.usuario_id = usuarios.id)', [id]);
    if (!cuenta) return res.status(404).json({ error: 'No se encontró esa cuenta o es la cuenta principal.' });
    await db.query("UPDATE usuarios SET activo = 0, permisos_admin_json = '[]' WHERE id = ?", [id]);
    // Revoca todas las sesiones activas del usuario deshabilitado.
    revocarSesionesUsuario(id);
    res.json({ ok: true, id, mensaje: 'Cuenta dada de baja. El historial de pedidos y facturas se conserva.' });
  } catch (error) {
    console.error('Error al dar de baja cuenta:', error.message);
    res.status(500).json({ error: 'No se pudo dar de baja la cuenta.', ...(process.env.NODE_ENV === 'production' ? {} : { codigo: error.code || null, detalle: error.sqlMessage || error.message }) });
  }
});

// Responde con un mensaje claro cuando Multer rechaza el archivo.
app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'La imagen supera el límite de 5 MB.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'La imagen es demasiado pesada. Usá una de hasta 5 MB.' });
  }
  console.error('Error del servidor:', error.message);
  res.status(400).json({ error: error.message || 'Error inesperado al procesar la solicitud.' });
});

app.listen(port, '0.0.0.0', async () => {
  console.log(`API lista en http://localhost:${port}`);
  console.log(`API accesible desde la red local en el puerto ${port}`);
  try {
    await db.query(
      'SELECT id, nombre, email, telefono, password_hash, rol, clave_unica_hash, activo FROM usuarios LIMIT 0'
    );
    console.log('MySQL conectado y tabla usuarios verificada.');
  } catch (error) {
    console.error('ATENCIÓN: la API inició, pero no pudo verificar MySQL/usuarios:', {
      code: error.code,
      sqlMessage: error.sqlMessage || error.message,
    });
    console.error('Revisá XAMPP, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME en backend/.env.');
  }
});
