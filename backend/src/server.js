import 'dotenv/config';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import multer from 'multer';
import mysql from 'mysql2/promise';

const app = express();
const port = Number(process.env.PORT || 3000);

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
         p.imagen_url AS imagenUrl, p.imagenes_json AS imagenesJson, p.activo
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
  if (producto.imagenUrl && String(producto.imagenUrl).length > 255) {
    return 'La dirección de la imagen supera los 255 caracteres.';
  }
  if (Array.isArray(producto.imagenes) && producto.imagenes.length > 3) return 'Cada producto puede tener como máximo tres imágenes.';
  return null;
}

function normalizarProducto(producto) {
  let imagenes = [];
  try { imagenes = producto.imagenesJson ? JSON.parse(producto.imagenesJson) : []; } catch { imagenes = []; }
  if (!imagenes.length && producto.imagenUrl) imagenes = [producto.imagenUrl];
  return { ...producto, imagenes, imagenUrl: imagenes[0] || producto.imagenUrl || '' };
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

// Comprueba que el teléfono llega al proceso Express, sin consultar MySQL.
app.get('/api/ping', (_req, res) => res.json({ ok: true, mensaje: 'Backend accesible por red.' }));

app.get('/api/estado', async (_req, res) => {
  try {
    // Además de probar la conexión, verifica que exista la tabla y las columnas usadas por el registro.
    await db.query(
      'SELECT id, nombre, email, password_hash, rol, clave_unica_hash, activo FROM usuarios LIMIT 0'
    );
    res.json({ ok: true, mensaje: 'Backend, MySQL y tabla usuarios conectados.' });
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
    res.status(500).json({ error: 'No se pudieron consultar las categorías.' });
  }
});

// CREATE: agrega una categoría nueva evitando duplicados por mayúsculas o espacios.
app.post('/api/categorias', async (req, res) => {
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
    res.status(500).json({ error: 'No se pudo crear la categoría.' });
  }
});

// READ: muestra todos los productos activos.
app.get('/api/productos', async (_req, res) => {
  try {
    const [productos] = await db.query(`${selectProductos} WHERE p.activo = 1 ORDER BY p.id DESC`);
    res.json(productos.map(normalizarProducto));
  } catch (error) {
    console.error('Error al consultar productos:', error.message);
    res.status(500).json({ error: 'No se pudieron consultar los productos.' });
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
    res.status(500).json({ error: 'No se pudo consultar el producto.' });
  }
});

// CREATE: guarda un producto nuevo. La categoría debe existir previamente en MySQL.
app.post('/api/productos', async (req, res) => {
  const errorValidacion = validarProducto(req.body);
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });
  const { nombre, categoria, descripcion = '', precio, imagenUrl = '', imagenes = [] } = req.body;
  try {
    const categoriaExistente = await obtenerCategoriaExistente(categoria);
    if (!categoriaExistente) return res.status(400).json({ error: 'La categoría seleccionada no existe. Actualizá la lista y elegí una opción.' });

    const [resultado] = await db.query(
      'INSERT INTO productos (nombre, categoria_id, descripcion, precio, imagen_url, imagenes_json) VALUES (?, ?, ?, ?, ?, ?)',
      [nombre.trim(), categoriaExistente.id, descripcion.trim() || null, Number(precio), (imagenes[0] || imagenUrl) || null, JSON.stringify(imagenes.slice(0, 3))]
    );
    const [[producto]] = await db.query(`${selectProductos} WHERE p.id = ?`, [resultado.insertId]);
    res.status(201).json(normalizarProducto(producto));
  } catch (error) {
    console.error('Error al crear producto:', error.message);
    res.status(500).json({ error: 'No se pudo publicar el producto.' });
  }
});

// UPDATE: cambia los datos de un producto existente.
app.put('/api/productos/:id', async (req, res) => {
  const id = Number(req.params.id);
  const errorValidacion = validarProducto(req.body);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID del producto no es válido.' });
  if (errorValidacion) return res.status(400).json({ error: errorValidacion });

  const { nombre, categoria, descripcion = '', precio, imagenUrl = '', imagenes = [] } = req.body;
  try {
    const [[existente]] = await db.query('SELECT id FROM productos WHERE id = ? AND activo = 1', [id]);
    if (!existente) return res.status(404).json({ error: 'No se encontró un producto activo con ese ID.' });

    const categoriaExistente = await obtenerCategoriaExistente(categoria);
    if (!categoriaExistente) return res.status(400).json({ error: 'La categoría seleccionada no existe.' });

    await db.query(
      `UPDATE productos
       SET nombre = ?, categoria_id = ?, descripcion = ?, precio = ?, imagen_url = ?, imagenes_json = ?
       WHERE id = ? AND activo = 1`,
      [nombre.trim(), categoriaExistente.id, descripcion.trim() || null, Number(precio), (imagenes[0] || imagenUrl) || null, JSON.stringify(imagenes.slice(0, 3)), id]
    );
    const [[producto]] = await db.query(`${selectProductos} WHERE p.id = ? AND p.activo = 1`, [id]);
    res.json(normalizarProducto(producto));
  } catch (error) {
    console.error('Error al actualizar producto:', error.message);
    res.status(500).json({ error: 'No se pudo actualizar el producto.' });
  }
});

// DELETE: realiza una baja lógica para no romper las ventas que ya existen.
app.delete('/api/productos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'El ID del producto no es válido.' });
  try {
    const [resultado] = await db.query('UPDATE productos SET activo = 0 WHERE id = ? AND activo = 1', [id]);
    if (!resultado.affectedRows) return res.status(404).json({ error: 'El producto no existe o ya fue eliminado.' });
    res.json({ ok: true, id, mensaje: 'Producto eliminado del catálogo.' });
  } catch (error) {
    console.error('Error al eliminar producto:', error.message);
    res.status(500).json({ error: 'No se pudo eliminar el producto.' });
  }
});

// Sube una imagen a ImgBB usando la clave guardada en backend/.env. Acepta dos formas de envío:
//  - multipart/form-data con un archivo (Thunder Client). El nombre del campo puede ser cualquiera.
//  - JSON { "image": "<base64>" } (la app en Expo Go).
app.post('/api/imagenes/producto', upload.any(), async (req, res) => {
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

// Registro de cuentas.
app.post('/api/auth/registro', async (req, res) => {
  const cuerpo = req.body && typeof req.body === 'object' ? req.body : {};
  const nombre = typeof cuerpo.nombre === 'string' ? cuerpo.nombre.trim() : '';
  const mail = typeof cuerpo.email === 'string' ? cuerpo.email.trim().toLowerCase() : '';
  const password = typeof cuerpo.password === 'string' ? cuerpo.password : '';
  const rol = typeof cuerpo.rol === 'string' ? cuerpo.rol.trim().toLowerCase() : 'cliente';
  const codigoAutorizacion = typeof cuerpo.codigoAutorizacion === 'string'
    ? cuerpo.codigoAutorizacion.trim()
    : '';
  const claveUnica = typeof cuerpo.claveUnica === 'string' ? cuerpo.claveUnica.trim() : '';

  if (!nombre || nombre.length > 100 || !/^\S+@\S+\.\S+$/.test(mail) || mail.length > 150 || password.length < 6) {
    return res.status(400).json({ error: 'Revisá nombre, correo y contraseña (mínimo 6 caracteres). Verificá también que el nombre y el correo no sean demasiado largos.' });
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
      'INSERT INTO usuarios (nombre, email, password_hash, rol, clave_unica_hash) VALUES (?, ?, ?, ?, ?)',
      [nombre, mail, passwordHash, rol, claveUnicaHash]
    );
    console.log(`Cuenta creada correctamente: usuario ID ${resultado.insertId} (${rol}).`);
    return res.status(201).json({ id: resultado.insertId, nombre, email: mail, rol });
  } catch (error) {
    // El mensaje completo queda en la terminal para identificar problemas reales de esquema o conexión.
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
      mensaje = 'La tabla usuarios no tiene todas las columnas que necesita el registro. Compará su estructura con database/dulces_lucho.sql.';
    } else if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      mensaje = 'El backend no puede conectarse con MySQL. Revisá que MySQL esté iniciado en XAMPP y los datos de backend/.env.';
    }

    return res.status(500).json({
      error: mensaje,
      detalle: process.env.NODE_ENV === 'production' ? undefined : (error.sqlMessage || error.message),
    });
  }
});

// Inicio de sesión.
app.post('/api/auth/login', async (req, res) => {
  try {
    const [[usuario]] = await db.query('SELECT * FROM usuarios WHERE email = ? AND activo = 1', [req.body.email?.trim().toLowerCase()]);
    if (!usuario || !await bcrypt.compare(req.body.password || '', usuario.password_hash)) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }
    res.json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, requiereClave: usuario.rol === 'admin' });
  } catch (error) {
    console.error('Error al iniciar sesión:', error.message);
    res.status(500).json({ error: 'No se pudo iniciar sesión.' });
  }
});

// Verificación adicional para administradores.
app.post('/api/auth/verificar-admin', async (req, res) => {
  try {
    const [[usuario]] = await db.query('SELECT * FROM usuarios WHERE id = ?', [req.body.usuarioId]);
    if (!usuario || usuario.rol !== 'admin' || !await bcrypt.compare(req.body.clave || '', usuario.clave_unica_hash || '')) {
      return res.status(401).json({ error: 'La clave única es incorrecta.' });
    }
    res.json({ id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol });
  } catch (error) {
    console.error('Error al verificar administrador:', error.message);
    res.status(500).json({ error: 'No se pudo verificar el administrador.' });
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
      'SELECT id, nombre, email, password_hash, rol, clave_unica_hash, activo FROM usuarios LIMIT 0'
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
