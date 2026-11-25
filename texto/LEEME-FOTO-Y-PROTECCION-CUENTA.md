# Dulces Lucho — Foto de perfil y protección de credenciales

Este complemento corrige el cambio de foto de perfil y agrega un flujo protegido para cambiar el correo Gmail y/o la contraseña.

## Archivos incluidos

- `backend/src/server.js`: subida de foto ligada al ID de usuario, verificación reforzada y actualización de credenciales con token temporal.
- `services/api.js`: envío de la foto como base64 desde Expo Go y manejo de errores.
- `context/AuthContext.js`: sincronización de foto y operaciones protegidas de credenciales.
- `screens/PerfilScreen.js`: actualización de foto usando la operación nueva.
- `screens/ConfiguracionScreen.js` y `screens/ConfiguracionCuentaScreen.js`: acceso a la pantalla de protección, sin formulario antiguo que evitaba la nueva verificación.
- `screens/ProteccionCuentaScreen.js`: nueva pantalla que verifica la identidad.
- `screens/CambiarCredencialesScreen.js`: pantalla que permite cambiar Gmail, contraseña o ambos.
- `App.js`: registra las dos pantallas.

## Instalación

1. Hacé una copia de seguridad del proyecto.
2. Extraé el ZIP en la carpeta principal de Dulces Lucho, donde está `App.js`, y aceptá reemplazar los archivos.
3. Conservá `.env` y `backend/.env`; no están incluidos en este paquete.
4. Confirmá que `backend/.env` conserve `IMGBB_API_KEY` y `ADMIN_REGISTRATION_CODE`. No pegues esas claves en el código móvil ni en Git.
5. Comprobá en phpMyAdmin que la columna de foto exista:

   ```sql
   SHOW COLUMNS FROM usuarios LIKE 'foto_perfil_url';
   ```

   Si devuelve una fila, no hace falta ejecutar ninguna migración. Este complemento usa las columnas que ya se agregaron en los parches anteriores (`foto_perfil_url`, `password_hash`, `clave_unica_hash` y `email`).
6. Reiniciá el backend (`cd backend` y `npm start`) y Expo (`npx expo start --lan -c`).

## Cómo funciona la protección

- Cliente: debe ingresar su contraseña actual.
- Administrador: debe ingresar su contraseña actual, el código general de administrador (`ADMIN_REGISTRATION_CODE` en `backend/.env`) y su clave personal de seis números.
- Si la verificación es correcta, el backend emite un permiso aleatorio de un solo uso que vence a los 5 minutos.
- La pantalla siguiente permite cambiar el Gmail, la contraseña o ambos. El backend consume el permiso al guardar.
- Se limitan los intentos fallidos a cinco; luego se aplica una pausa de diez minutos para esa combinación de IP y usuario.
- El correo nuevo se valida por formato y unicidad. No se envía un correo de confirmación porque el proyecto todavía no tiene un servicio de envío de emails.
- La contraseña se guarda con bcrypt, nunca en texto plano.

## Foto de perfil

La app ahora envía la imagen a `POST /api/usuarios/:id/foto-perfil`. El backend valida los bytes, la sube a ImgBB y guarda la URL en `usuarios.foto_perfil_url` en una misma operación. Si la subida falla, la app muestra el error que devuelve el servidor y no cambia la foto guardada.

Límite: 5 MB. Se solicita al selector una copia optimizada para reducir el peso.

## Pruebas

Thunder Client puede probar las rutas de credenciales. La subida de foto conviene probarla desde la pantalla Mi perfil, que genera el base64 del archivo elegido.
