# Dulces Lucho — BannerAdmin y diagnóstico del error 500

Este paquete completa el archivo que faltaba en el ZIP de Configuración: `screens/BannersAdminScreen.js`. También incluye el carrusel del inicio y una migración conjunta para crear/asegurar las tablas y columnas que utilizan Banners y Configuración.

## Instalación

1. Hacé una copia de seguridad de la carpeta del proyecto y de la base `dulces_lucho`.
2. En phpMyAdmin, abrí `dulces_lucho` > SQL y ejecutá `database/migracion_completa_banners_configuracion.sql`. No importes de nuevo `dulces_lucho.sql`: ese archivo base elimina y recrea tablas.
3. Extraé el ZIP en la raíz de `Dulces-Lucho-App` (la carpeta donde está `App.js`) y combiná/reemplazá los archivos.
4. Conservá tus `.env` y `backend/.env`. No están incluidos.
5. Reiniciá el backend desde `backend` con `npm start` y Expo desde la raíz con `npx expo start --lan -c`.

## Archivos que incluye

- `screens/BannersAdminScreen.js`: pantalla de administración de banners, con carga desde galería, subida a ImgBB, edición, orden, mostrar/ocultar y quitar.
- `components/SliderBanners.js` y `screens/HomeScreen.js`: carrusel automático en el inicio.
- `backend/src/server.js`: rutas de banners/configuración; `/api/estado` también verifica que exista `banners`. En desarrollo, las respuestas 500 incluyen `codigo` y `detalle` SQL para identificar el fallo. En producción no se muestran esos detalles.
- pantallas y servicios del parche de Configuración.

## Pruebas en Thunder Client (todas GET, salvo que se indique)

1. `GET http://localhost:3000/api/estado` — debe devolver HTTP 200 y mencionar banners conectados.
2. `GET http://localhost:3000/api/banners/admin` — debe devolver `[]` si todavía no cargaste banners.
3. `GET http://localhost:3000/api/banners` — devuelve solo banners activos.

Para verificar el CRUD de banners:

- `POST http://localhost:3000/api/banners` con Body JSON: `{ "titulo": "Promo de prueba", "imagenUrl": "https://i.ibb.co/URL-DE-IMAGEN.jpg", "orden": 1 }`.
- `PUT http://localhost:3000/api/banners/1` con Body JSON: `{ "titulo": "Promo actualizada", "imagenUrl": "https://i.ibb.co/URL-DE-IMAGEN.jpg", "orden": 1, "activo": true }`.
- `DELETE http://localhost:3000/api/banners/1` hace baja lógica (lo oculta, no borra permanentemente).

Usá una URL real de ImgBB en la prueba POST/PUT; la URL de ejemplo no sirve para cargar una imagen real.

## Si sigue apareciendo HTTP 500

No sigas cambiando código a ciegas. Probá primero `GET /api/estado` y `GET /api/banners/admin`. Copiá el JSON de respuesta y la línea roja completa que aparece en la terminal donde corre `npm start`. El backend de este paquete devuelve `detalle` y `codigo` en desarrollo, por ejemplo `ER_NO_SUCH_TABLE` o `ER_BAD_FIELD_ERROR`, que permiten corregir el problema exacto.

El 500 no se puede atribuir con certeza sin saber qué endpoint lo devuelve. Si `/api/estado` da 200 pero otro endpoint da 500, el JSON de esa solicitud y la terminal identifican la consulta que falla.
