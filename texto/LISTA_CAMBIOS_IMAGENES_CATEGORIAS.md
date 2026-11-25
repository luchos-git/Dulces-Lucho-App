# cambios de imágenes y categorías

## archivos modificados

### `screens/PanelAdminScreen.js`

- reemplaza el campo de texto libre de categoría por un selector desplegable.
- carga las categorías existentes desde el backend.
- muestra las opciones Bolsitas, Jugos y Combos.
- conserva la categoría actual al editar un producto.
- limita la imagen seleccionada a 5 MB.
- muestra estados y errores durante la selección y subida.

### `services/api.js`

- mantiene el envío de imágenes como `multipart/form-data`, sin fijar manualmente el encabezado boundary.
- valida que haya una imagen seleccionada antes de enviarla.

### `backend/src/server.js`

- agrega `GET /api/categorias`.
- deja de crear categorías automáticamente al guardar productos.
- acepta únicamente las categorías oficiales que existen en el catálogo.
- devuelve mensajes de ImgBB más claros para diagnosticar la clave o el archivo.

### `.env` (carpeta principal)

- configura la URL local para Expo Go con la IP `10.0.20.95`.

### `backend/.env`

- configura MySQL y la clave privada de ImgBB para el backend local.
- no debe subirse a GitHub ni compartirse públicamente.

## archivo nuevo

### `database/unificar_categoria_jugo.sql`

- si quedó una categoría singular `Jugo` de pruebas anteriores, reasigna sus productos a `Jugos` y elimina la categoría singular.
- no modifica nada si la categoría `Jugo` no existe.

## comprobaciones

- sintaxis del backend revisada con Node.js.
- sintaxis de los 35 archivos JavaScript/JSX revisada.
- no se pudo hacer una prueba real contra la base MySQL de tu computadora ni una subida remota a ImgBB desde este entorno.
