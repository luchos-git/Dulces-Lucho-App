# pruebas con thunder client y expo go

## para qué sirve cada herramienta

expo go ejecuta la aplicación en el celular mediante el qr que muestra expo. thunder client sirve para enviar solicitudes directamente al backend y revisar sus respuestas. mysql guarda los datos y se administra desde phpmyadmin o desde otro cliente sql. no son la misma cosa y no se reemplazan entre sí

## iniciar cada parte

primero encendé apache y mysql desde xampp si usás phpmyadmin, e importá `database/dulces_lucho.sql` si todavía no creaste las tablas

después abrí una terminal dentro de `backend` y ejecutá `npm install` y `npm start`. el backend queda escuchando en el puerto 3000

en otra terminal, desde la carpeta principal, ejecutá `npm install` y `npx expo start --lan -c`. expo va a mostrar un qr. escanealo con expo go desde el celular

## configurar la conexión del celular

thunder client se ejecuta en la computadora, por eso puede usar `http://localhost:3000`. el celular no puede usar esa dirección para llegar a la computadora, porque `localhost` dentro del teléfono significa el propio teléfono

copiá `.env.example` como `.env` en la carpeta principal de la app y reemplazá la ip de ejemplo por la ipv4 de tu computadora. en windows abrí cmd y ejecutá `ipconfig`; buscá la dirección ipv4 del adaptador wifi, por ejemplo `192.168.1.20`

el archivo `.env` debe quedar con una línea parecida a `EXPO_PUBLIC_API_URL=http://192.168.1.20:3000/api`. después de cambiarla, detené expo y volvé a iniciar con `npx expo start --lan -c`. el celular y la pc deben estar en la misma red y el firewall de windows tiene que permitir conexiones de node en el puerto 3000

## verificar que mysql y el backend estén conectados

método: `GET`

url: `http://localhost:3000/api/estado`

respuesta esperada: `{"ok":true}`

si aparece un error 503, revisá que mysql esté encendido y que el archivo `backend/.env` tenga el nombre y los datos correctos de la base

## crear una cuenta de cliente

método: `POST`

url: `http://localhost:3000/api/auth/registro`

body json:

```json
{
  "nombre": "cliente de prueba",
  "email": "cliente.prueba@example.com",
  "password": "cliente123",
  "rol": "cliente"
}
```

la respuesta correcta tiene estado 201 y devuelve el id de la cuenta creada. usá un correo que no exista todavía en la tabla usuarios

## crear una cuenta de administrador autorizada

método: `POST`

url: `http://localhost:3000/api/auth/registro`

body json:

```json
{
  "nombre": "administrador de prueba",
  "email": "admin.prueba@example.com",
  "password": "admin123",
  "rol": "admin",
  "codigoAutorizacion": "DULCES-ADMIN-2026",
  "claveUnica": "482913"
}
```

el campo `codigoAutorizacion` tiene que ser idéntico al valor `ADMIN_REGISTRATION_CODE` del archivo `backend/.env`. la clave única tiene que tener seis números. la api guarda las dos claves con bcrypt, no como texto común. si el registro se hace desde la pantalla del celular, el código también tiene que coincidir con `CODIGO_AUTORIZACION_ADMIN` en `data/usuarios.js`, porque el formulario revisa ese valor antes de enviarlo

## iniciar sesión como administrador

método: `POST`

url: `http://localhost:3000/api/auth/login`

body json:

```json
{
  "email": "admin.prueba@example.com",
  "password": "admin123"
}
```

la respuesta correcta incluye `requiereClave: true`. eso significa que el correo y la contraseña son correctos, pero todavía falta comprobar la clave única

## verificar la clave única

método: `POST`

url: `http://localhost:3000/api/auth/verificar-admin`

body json, cambiando el id por el que devolvió el registro o el inicio de sesión:

```json
{
  "usuarioId": 1,
  "clave": "482913"
}
```

si la clave coincide, la respuesta devuelve los datos de la cuenta con rol admin

## consultar administradores desde mysql

esto se ejecuta en phpmyadmin o en una consola sql, no en thunder client

```sql
USE dulces_lucho;

SELECT id, nombre, email, rol, activo
FROM usuarios
WHERE rol = 'admin';
```

## probar el catálogo de productos

consultar productos activos

método: `GET`

url: `http://localhost:3000/api/productos`

crear un producto

método: `POST`

url: `http://localhost:3000/api/productos`

body json:

```json
{
  "nombre": "alfajor de prueba",
  "categoria": "alfajores",
  "descripcion": "producto para probar el alta",
  "precio": 1500,
  "imagenUrl": ""
}
```

actualizar un producto

método: `PUT`

url: `http://localhost:3000/api/productos/1`

body json:

```json
{
  "nombre": "alfajor actualizado",
  "categoria": "alfajores",
  "descripcion": "producto actualizado desde thunder client",
  "precio": 1800,
  "imagenUrl": ""
}
```

ocultar un producto sin borrarlo físicamente

método: `DELETE`

url: `http://localhost:3000/api/productos/1`

## aclaración sobre la palabra aprobar

el código actual permite dar de alta una cuenta administradora mediante el código de autorización y la clave única. no existe una tabla de solicitudes pendientes ni una ruta para que otro administrador apruebe solicitudes. además, las rutas de productos no comprueban el rol dentro del backend: el panel oculta las opciones según el rol, pero una persona que conozca la api podría llamar esas rutas desde thunder client. para un uso real habría que agregar autenticación y autorización también en el servidor

si con aprobar te referís a aprobar o confirmar el pago de un pedido, esa operación todavía no está conectada a una ruta del backend. la pantalla de compra muestra un pago aprobado como simulación y crea el pedido en el almacenamiento local del celular, mientras que la tabla `ventas` de mysql es una estructura preparada para guardar ventas. thunder client no puede modificar un pedido de la app hasta que se implemente una ruta de ventas y pedidos


## límites de seguridad del prototipo

el código de autorización también aparece en el código de la app para validar el formulario, así que no debe tratarse como una clave secreta. el backend hace una segunda comprobación desde `backend/.env`. las rutas de productos todavía no exigen una sesión ni un rol dentro del servidor, por lo que no conviene publicar esta api tal como está sin agregar autenticación y autorización
