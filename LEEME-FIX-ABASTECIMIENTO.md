# Corrección de la ruta Stock y proveedores

## Causa
El `server.js` usado en ejecución pertenecía al parche de sesión administrativa, pero era una versión anterior a la incorporación del módulo de stock. Por eso Express no conocía `GET /api/admin/abastecimiento` y respondía `Cannot GET`.

## Archivo incluido
- `backend/src/server.js`: versión que contiene las rutas de stock, proveedores, pedidos a proveedores, productos destacados y pedidos anticipados. También conserva la verificación adicional de administradores y la emisión de `sessionToken` después de verificar la clave personal.

## Instalación
1. Detené el backend con `Ctrl + C`.
2. Hacé una copia del archivo actual `backend/src/server.js`.
3. Extraé este ZIP en la carpeta raíz del proyecto y reemplazá `backend/src/server.js`.
4. No reemplaces ni modifiques `.env`, `backend/.env` ni la base de datos.
5. Desde la carpeta `backend`, ejecutá `npm start`.

## Prueba
Con el backend iniciado, usá Thunder Client:

GET `http://localhost:3000/api/admin/abastecimiento?adminId=9`

Si la sesión administrativa está activa y las migraciones ya se ejecutaron, debe responder JSON con `productos`, `proveedores`, `pedidos` y `anticipados`. Si devuelve `500`, mirá el detalle SQL de la respuesta y la terminal; en ese caso la ruta ya existe y el problema restante será de esquema o datos, no un `Cannot GET`.

No hace falta reiniciar Expo si no se reemplazó ningún archivo de la app móvil. Para probar desde el celular, mantené el backend activo y volvé a abrir Stock y proveedores.
