# cambios de categorías, conexión e imágenes

## categorías

- se muestran siempre las categorías principales: Bolsitas, Jugos y Combos
- se agregó `POST /api/categorias` para crear categorías nuevas desde el panel
- las categorías se guardan en MySQL y se evita crear duplicados por diferencias de mayúsculas o espacios
- las categorías nuevas aparecen automáticamente en el selector

## conexión

- se agregó `GET /api/ping`, que comprueba el acceso al backend sin depender de MySQL
- los errores de conexión ahora indican la ruta que estaba intentando usar la app y muestran el detalle de red disponible

## productos e imágenes

- el formulario permite elegir hasta tres imágenes por producto
- cada imagen se sube a ImgBB y se guardan las URLs en `productos.imagenes_json`
- se conserva `imagen_url` con la primera foto para compatibilidad con la app anterior
- el catálogo y la ficha muestran un carrusel automático que cambia cada 1.5 segundos
- al editar un producto se conservan las imágenes existentes si no se seleccionan otras

## interacción del precio

- el precio quedó fuera del área táctil que abre el detalle del producto
- tocar el importe ya no navega al detalle; se puede tocar la imagen o el nombre

## archivos principales

- `backend/src/server.js`
- `services/api.js`
- `screens/PanelAdminScreen.js`
- `screens/HomeScreen.js`
- `screens/DetalleProducto.js`
- `components/SliderImagenes.js` (nuevo)
- `context/ProductosContext.js`
- `database/dulces_lucho.sql`
- `database/migracion_imagenes_y_categorias.sql` (nuevo)

## paso obligatorio en una base existente

En phpMyAdmin, seleccioná `dulces_lucho`, abrí la pestaña SQL y ejecutá una sola vez `database/migracion_imagenes_y_categorias.sql`. Esto agrega la columna `imagenes_json` y asegura las categorías principales. No vuelvas a importar `dulces_lucho.sql` porque ese archivo elimina y recrea las tablas.

## prueba de red desde el teléfono

Con el backend encendido, abrí en el navegador del celular:

`http://10.0.20.95:3000/api/ping`

Debe devolver `{"ok":true,"mensaje":"Backend accesible por red."}`. Si no abre, la red escolar o el firewall impiden que el teléfono llegue a la PC, aunque ambos estén conectados al mismo Wi-Fi. Si abre, la red está bien y el error restante debe buscarse en la ruta o la operación concreta.
