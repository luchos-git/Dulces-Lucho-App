# dulces lucho

aplicación móvil hecha con expo y react native. se inicia con expo go mediante el qr; no necesita apk ni aab para probarse. incluye catálogo, carrito, compras, seguimiento, perfil, configuración, comprobantes y un panel de administración conectado a mysql.

## iniciar la aplicación

1. encendé apache y mysql desde xampp.
2. en una primera terminal de vs code, ejecutá `cd backend` y luego `npm start`. dejá esa terminal abierta.
3. en una segunda terminal, desde la carpeta principal, ejecutá `npx expo start --lan -c`. escaneá el qr con expo go y dejá esa terminal abierta también.

el archivo `.env` de la carpeta principal configura la dirección del backend para el celular. en esta copia está puesta la ip que compartiste: `10.0.20.95`. si cambia la red, actualizá `EXPO_PUBLIC_API_URL` con la nueva ip de la computadora.

el archivo `backend/.env` configura mysql e imgbb. no publiques esos archivos en github. el proyecto incluye la configuración local que ya habías compartido; revisala antes de entregar o publicar el repositorio.

## formulario de administración

la pantalla `PanelAdmin` tiene un formulario con nombre, categoría, descripción, precio e imagen. la categoría se elige desde una lista traída de mysql; no se escribe libremente. se puede elegir una foto desde el celular, verla antes de guardar y subirla a imgbb.

el formulario sirve tanto para publicar un producto como para modificar uno existente. debajo aparece la lista de productos con botones visibles de **Modificar** y **Eliminar**. al entrar a una ficha de producto, la cuenta administradora también ve las opciones **Modificar producto** y **Eliminar del catálogo**.

la eliminación es lógica: el producto deja de aparecer en la tienda pero se conserva en mysql para no romper las ventas anteriores.

## rutas de la api

base local para thunder client: `http://localhost:3000`

- `GET /api/estado`
- `GET /api/categorias`
- `GET /api/productos`
- `GET /api/productos/:id`
- `POST /api/productos`
- `PUT /api/productos/:id`
- `DELETE /api/productos/:id`
- `POST /api/imagenes/producto` (form-data, campo `image`, tipo File)
- `POST /api/auth/registro`
- `POST /api/auth/login`
- `POST /api/auth/verificar-admin`

## documentos

- `CORRECCION_DISENO_Y_CRUD.md`: resumen de esta corrección y archivos modificados.
- `THUNDER_CLIENT_PRODUCTOS.md`: pasos y cuerpos JSON para probar cada ruta.
- `documentacion.md`: explicación general de la estructura.
- `INDICE_DE_ARCHIVOS.md`: índice archivo por archivo.

## dependencias

si es una carpeta nueva, ejecutá `npm install` en la carpeta principal y `npm install` dentro de `backend`. `expo-image-picker` ya está declarado en `package.json` y configurado en `app.json`.
