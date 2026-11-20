# prueba de imágenes y categorías

## categorías disponibles

El formulario consulta `GET /api/categorias` y muestra las categorías que ya existen en MySQL: Bolsitas, Jugos y Combos. Ya no permite escribir una categoría libre.

En Thunder Client:

- método: `GET`
- URL: `http://localhost:3000/api/categorias`

La respuesta esperada es una lista con los identificadores y nombres de las categorías existentes.

El backend ahora rechaza una categoría que no pertenezca a la lista oficial. No crea categorías nuevas automáticamente.

## imágenes de productos

La clave de ImgBB se configura solamente en `backend/.env`, mediante `IMGBB_API_KEY`. No debe colocarse en el `.env` de Expo ni dentro del código de la aplicación.

Para probar desde el celular:

1. iniciar MySQL en XAMPP
2. abrir una terminal en `backend` y ejecutar `npm start`
3. abrir una segunda terminal en la carpeta principal y ejecutar `npx expo start --lan -c`
4. en Expo Go, entrar como administrador y abrir el panel de administración
5. tocar `Elegir foto desde el celular`, seleccionar una imagen y luego `Agregar producto` o `Guardar cambios`

Al guardar, el backend recibe el archivo, lo envía a ImgBB y guarda la URL devuelta en `productos.imagen_url`.

## comprobación en MySQL

```sql
USE dulces_lucho;
SELECT id, nombre, categoria_id, imagen_url
FROM productos
ORDER BY id DESC;
```

La columna `imagen_url` debe contener una URL de ImgBB para el producto al que se le cargó una foto.
