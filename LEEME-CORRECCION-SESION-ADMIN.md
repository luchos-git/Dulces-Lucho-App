# Corrección de sesión de administrador

## Causa identificada

La pantalla móvil espera que `POST /api/auth/verificar-admin` devuelva la propiedad JSON `sessionToken`. Una versión anterior de `backend/src/server.js` validaba la clave de seis números, pero respondía solo con los datos del usuario y no emitía ese token. Eso provoca exactamente el mensaje: «el servidor no emitió una sesión segura».

## Instalación

1. Cerrá Expo si está corriendo y detené el backend con `Ctrl + C`.
2. Copiá `backend/src/server.js` de este paquete a la misma ruta dentro de tu proyecto, reemplazando el archivo anterior.
3. No reemplaces `.env`, `backend/.env`, la base de datos ni otros archivos.
4. Abrí una terminal en la carpeta `backend` y ejecutá `npm start`.
5. Comprobá que la terminal muestre `API lista en http://localhost:3000`.
6. Volvé a la app, cerrá sesión si quedó pendiente y volvé a iniciar sesión.

## Qué deberías ver en la terminal

Al validar la contraseña del administrador:

`[AUTH] Contraseña de administrador validada. Falta la clave personal para usuario ID 9.`

Al validar correctamente la clave de seis números:

`[AUTH] Verificación de administrador correcta. Sesión segura emitida para usuario ID 9.`

No se imprimen contraseñas, códigos ni claves personales.

## Respuesta esperada del endpoint

`POST http://localhost:3000/api/auth/verificar-admin`

JSON de prueba:

```json
{
  "usuarioId": 9,
  "clave": "TU_CLAVE_PERSONAL_DE_SEIS_NUMEROS"
}
```

Cuando la clave sea correcta, la respuesta HTTP 200 incluye `sessionToken`, `id`, `rol`, `esPropietario` y `permisosAdmin`.

No compartas ni captures el valor de `clave` ni `sessionToken`. Si la respuesta es 401, la clave no coincide o la cuenta no está activa. Si es 500, revisá el detalle que devuelve el backend en desarrollo.
