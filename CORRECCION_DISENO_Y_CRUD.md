# Corrección del panel de administración y del CRUD

Esta versión parte del proyecto anterior y mantiene las pantallas de perfil, configuración y comprobantes que ya se habían agregado. Se restauró el diseño simple del proyecto original: fondo crema, tarjetas blancas y botones naranjas/azules. No se reemplazó la navegación ni se cambió Expo Go.

## Qué queda disponible en el panel de administración

El formulario de productos está dentro de `screens/PanelAdminScreen.js` e incluye nombre, categoría seleccionable desde MySQL, descripción, precio e imagen elegida desde el celular. El mismo formulario sirve para publicar un producto nuevo y para modificar uno existente.

Debajo del formulario aparece el listado de productos publicados. Cada fila tiene los botones **Modificar** y **Eliminar**. Al elegir Modificar, los datos del producto se cargan en el formulario. Al elegir Eliminar, se pide confirmación y se realiza una baja lógica para conservar las ventas anteriores.

En `screens/DetalleProducto.js` también aparecen las opciones **Modificar producto** y **Eliminar del catálogo**, pero solamente cuando la sesión verificada tiene rol `admin`.

## Archivos modificados

- `screens/PanelAdminScreen.js`: formulario completo, selector de categorías, selección y vista previa de imagen, botones Modificar y Eliminar.
- `screens/DetalleProducto.js`: acciones de administrador en la ficha del producto; conserva los estilos y funciones de compra.
- `services/api.js`: envío multipart correcto para imágenes, sin fijar manualmente el encabezado Content-Type.
- `backend/src/server.js`: GET de categorías, GET de producto por ID, POST, PUT, DELETE lógico y subida a ImgBB con mensajes de error más claros.
- `context/ProductosContext.js`: refresco de catálogo y actualización de caché por ID.
- `context/AuthContext.js`: comprobación del rol administrador sin depender de mayúsculas/minúsculas.
- `.gitignore`: excluye los archivos `.env` locales.

Se conservan las pantallas de perfil, configuración y comprobantes que ya estaban en la versión anterior. No se cambiaron Home, Login, Registro, Carrito ni el flujo de compra.

## Variables de entorno

La carpeta principal contiene `.env` para Expo Go:

`EXPO_PUBLIC_API_URL=http://10.0.20.95:3000/api`

`backend/.env` contiene los datos de conexión MySQL y la clave privada de ImgBB. No publiques ninguno de esos archivos en GitHub.

## Cómo iniciar

1. Abrir XAMPP y encender MySQL.
2. Abrir una terminal de VS Code y ejecutar `cd backend` y `npm start`. Dejarla abierta.
3. Abrir una segunda terminal desde la carpeta principal y ejecutar `npx expo start --lan -c`. Dejarla abierta y escanear el QR con Expo Go.

## Pruebas con Thunder Client

Base URL: `http://localhost:3000`

- `GET /api/estado`
- `GET /api/categorias`
- `GET /api/productos`
- `GET /api/productos/1`
- `POST /api/productos`
- `PUT /api/productos/1`
- `DELETE /api/productos/1`
- `POST /api/imagenes/producto` con Body > Form > campo `image` de tipo File

### Body de ejemplo para POST

```json
{
  "nombre": "Producto de prueba",
  "categoria": "Bolsitas",
  "descripcion": "Producto para comprobar el alta.",
  "precio": 1500,
  "imagenUrl": ""
}
```

### Body de ejemplo para PUT

```json
{
  "nombre": "Producto de prueba actualizado",
  "categoria": "Bolsitas",
  "descripcion": "Producto para comprobar la modificación.",
  "precio": 1600,
  "imagenUrl": ""
}
```

La categoría debe existir en la tabla `categorias`. El formulario no crea categorías al escribir: se elige una existente.

## Nota sobre las imágenes

En la app, se elige la imagen desde la galería del celular. La app envía el archivo al backend y el backend lo sube a ImgBB; después guarda la URL recibida en `productos.imagen_url`. Si ImgBB rechaza el archivo, el mensaje devuelto por el servidor se muestra en la app. La subida real debe probarse con el backend encendido y conexión a internet.
