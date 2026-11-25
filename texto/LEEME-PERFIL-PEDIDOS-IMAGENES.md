# Parche: perfil, pedidos por cuenta e imágenes

Este paquete contiene solo los archivos de la aplicación que se deben reemplazar para aplicar estos ajustes. No reemplaza el proyecto entero y no toca los apartados de banners/configuración ya instalados.

## Qué corrige

- **Pedidos y comprobantes por cuenta:** el historial local queda guardado en una clave de AsyncStorage por ID de usuario. La app consulta `GET /api/usuarios/:usuarioId/pedidos` y vuelve a filtrar la respuesta por ese mismo `usuarioId`. Una respuesta tardía de una sesión anterior ya no puede sobrescribir la sesión nueva. Cada registro identifica `usuarioId` y `pedidoId`.
- **Relación en MySQL:** el esquema existente ya usa `ventas.usuario_id` para vincular cada pedido con su dueño, `ventas.id` como ID del pedido y `detalle_ventas.venta_id` como relación con sus artículos. No hace falta crear una tabla `pedidos` adicional.
- **Miniaturas en Inicio:** las tarjetas ahora dan un ancho definido al área que contiene el carrusel de imágenes. Se prioriza la URL directa de ImgBB y se contemplan los formatos `imagenesJson`, `imagenes_json`, `imagenUrl`, `miniaturaUrl` y objetos de ImgBB.
- **Foto de perfil:** se sube a ImgBB desde el celular y se guarda su URL en `usuarios.foto_perfil_url`, vinculada al usuario actual.
- **Cerrar sesión:** el botón permanece visible en Mi perfil y en el menú. Al cerrar la sesión, la navegación vuelve al acceso y el contexto de pedidos cambia a vacío; no se necesita pulsar `r` en Expo.
- **Ver contraseña:** los campos de contraseña de ingreso, registro, verificación de administrador y cambio de contraseña tienen control Ver/Ocultar. El CVV sigue oculto porque es un código de seguridad de tarjeta, no una contraseña.

## Instalación

1. Hacé una copia de seguridad de la carpeta del proyecto y de la base `dulces_lucho`.
2. En phpMyAdmin, seleccioná `dulces_lucho` y ejecutá una sola vez `database/migracion_foto_perfil_y_miniaturas.sql`. La migración es compatible con MariaDB y no borra ventas, pedidos, usuarios ni productos.
3. Extraé el ZIP en la carpeta raíz de la app (la que contiene `App.js`) y aceptá reemplazar los archivos manteniendo sus carpetas.
4. **No reemplaces** `.env` ni `backend/.env`. El ZIP no los incluye. La subida de fotos necesita que la variable `IMGBB_API_KEY` siga configurada en `backend/.env`.
5. Reiniciá el backend (`cd backend` y `npm start`) y Expo (`npx expo start --lan -c`).

## Comprobaciones importantes

- Para pedidos: cerrar sesión en cliente A, entrar con cliente B y abrir Mis pedidos/Facturas. B solo debe ver los registros cuyo `usuario_id` sea B.
- Para probar con Thunder Client: `GET http://localhost:3000/api/usuarios/ID_USUARIO/pedidos`. El detalle de un pedido se consulta con `GET http://localhost:3000/api/usuarios/ID_USUARIO/pedidos/ID_PEDIDO`. Si el pedido pertenece a otro usuario, la ruta individual devuelve 404.
- Para revisar las relaciones reales de SQL, ejecutá `database/verificar_pedidos_por_usuario.sql` y cambiá el valor de `@usuario_id`.
- Para las imágenes: `GET http://localhost:3000/api/productos` devuelve `imagenUrl`, `miniaturaUrl` e `imagenes`. En el Panel de administración, volvé a subir las fotos de productos cuya URL anterior ya estuviera truncada o fuera inválida; ampliar la columna no puede reconstruir una URL que ya se perdió.
- La app sube foto de perfil automáticamente: primero `POST /api/imagenes/perfil` a ImgBB y luego `PUT /api/usuarios/ID_USUARIO/foto-perfil` para guardar la URL en MySQL.

## Nota sobre datos existentes

Los pedidos antiguos se muestran en la cuenta a la que estén asociados en `ventas.usuario_id`. Los pedidos guardados solo en la antigua clave local global, sin ID de usuario, se dejan de mostrar deliberadamente porque no sería correcto asignarlos a una cuenta al azar. No se borran de MySQL.

## Alcance de la validación

Se revisó la sintaxis del backend y se transpilaron los archivos JS/JSX incluidos para detectar errores de sintaxis. La migración y las imágenes deben comprobarse con tu XAMPP y tu celular, porque no tengo acceso a tu instancia local ni a ImgBB desde aquí.
