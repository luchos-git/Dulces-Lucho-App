# Pruebas de Thunder Client — Protección de cuenta

Usá `http://localhost:3000/api` en la computadora. Para solicitudes desde el celular, usá la IP local actual de la PC.

## 1. Verificar una cuenta cliente

**POST** `/auth/verificar-proteccion-cuenta`

Body → JSON:

```json
{
  "usuarioId": 4,
  "passwordActual": "CONTRASEÑA_ACTUAL"
}
```

Respuesta esperada: `200 OK`, con `token` y `venceEnSegundos: 300`.

## 2. Verificar una cuenta administradora

**POST** `/auth/verificar-proteccion-cuenta`

Body → JSON:

```json
{
  "usuarioId": 1,
  "passwordActual": "CONTRASEÑA_ACTUAL",
  "codigoAdmin": "CODIGO_ADMIN_DE_BACKEND_ENV",
  "claveUnica": "123456"
}
```

La `claveUnica` es la clave personal de seis números de esa cuenta administradora. El `codigoAdmin` es el valor configurado en `ADMIN_REGISTRATION_CODE` dentro de `backend/.env`.

## 3. Cambiar Gmail, contraseña o ambos

Copiá el `token` devuelto en el paso anterior.

**PUT** `/usuarios/4/credenciales`

Headers:

```text
X-Proteccion-Cuenta: PEGAR_TOKEN_RECIBIDO
Content-Type: application/json
```

Body → JSON (solo Gmail):

```json
{
  "nuevoEmail": "nuevo.correo@gmail.com",
  "nuevaPassword": ""
}
```

Body → JSON (solo contraseña):

```json
{
  "nuevoEmail": "",
  "nuevaPassword": "NUEVA_CONTRASEÑA"
}
```

Body → JSON (ambos):

```json
{
  "nuevoEmail": "nuevo.correo@gmail.com",
  "nuevaPassword": "NUEVA_CONTRASEÑA"
}
```

El token es de un solo uso, dura cinco minutos y está vinculado al ID que pasó la verificación. Para otra modificación, repetí el paso 1.

## 4. Foto de perfil

La app usa automáticamente:

**POST** `/usuarios/4/foto-perfil`

Body → JSON:

```json
{
  "image": "BASE64_DE_LA_IMAGEN"
}
```

No hace falta escribir manualmente el base64 en Thunder Client: la prueba recomendada es elegir la foto desde Mi perfil. El backend sube a ImgBB y guarda `foto_perfil_url` en la misma operación.

## Errores esperables

- `401`: contraseña/código/clave personal incorrectos, o token inválido/vencido.
- `409`: el Gmail ya pertenece a otra cuenta.
- `413`: la foto supera los 5 MB.
- `503`: falta configurar `IMGBB_API_KEY` en `backend/.env`.
- `502`: ImgBB rechazó la imagen o el servidor no pudo comunicarse con ImgBB.
