# Ajustes puntuales solicitados — Dulces Lucho

Este parche contiene únicamente los cambios relacionados con:

1. La confirmación al intentar salir de Preparar compra.
2. Mostrar la dirección del local en el carrito y calcular kilómetros desde la dirección que configura el administrador.
3. Recuperar el carrito por usuario después de cerrar sesión o reiniciar Expo.

## Archivos incluidos

- `context/CarritoContext.js`: guarda y recupera el carrito en AsyncStorage, separado por ID de usuario.
- `App.js` y `screens/PerfilScreen.js`: dejan de vaciar el carrito al cerrar sesión.
- `screens/prepararCompra.js`: agrega el aviso de salida. No agrega la dirección del local en Inicio ni cambia el formulario original de compra.
- `screens/carrito.js`: muestra las direcciones personales guardadas en el carrito, selecciona la principal y muestra la dirección del local.
- `components/EntregaEnvio.js`: consulta los datos públicos de la tienda para mostrar el origen real en el carrito.
- `services/envio.js`: geocodifica dirección/localidad del local y del cliente; elimina las coordenadas fijas de ejemplo.
- `database/migracion_configuracion_local_envios.sql`: crea o completa la tabla `configuracion_tienda` requerida por el backend.

## Instalación

1. Hacé una copia de seguridad del proyecto.
2. Extraé el ZIP en la raíz de `Dulces-Lucho-App` y reemplazá solamente los archivos incluidos.
3. En phpMyAdmin seleccioná `dulces_lucho`, abrí SQL y ejecutá `database/migracion_configuracion_local_envios.sql`.
4. En la app, ingresá como administrador a Configuración de la tienda y guardá la dirección y localidad reales del local. No alcanza con que el campo diga que los datos se comparten: tienen que guardarse correctamente.
5. Reiniciá el backend y luego Expo con `npx expo start --lan -c`.

## Qué se conserva

- No se cambia la IP ni los archivos `.env`.
- No se modifica Inicio ni se agrega allí la dirección del local.
- No se agrega un bloque de dirección del local en Preparar compra.
- No se borra el carrito al cerrar sesión. Cada cuenta conserva su propio carrito en el mismo teléfono.
- El cartel de salida aclara que el pedido no queda confirmado; los productos permanecen en el carrito.

## Nota sobre la distancia

El cálculo usa las direcciones guardadas en `configuracion_tienda` y la dirección elegida en el carrito. Requiere conexión a Internet para consultar Nominatim/OpenStreetMap y OSRM. Si OSRM no responde, calcula una distancia aproximada en línea recta.
