# Reparación de recepción de mercadería — Dulces Lucho

Reemplaza únicamente `screens/AdminStockScreen.js`.

## Cambio

La confirmación de recepción ya no depende de `Alert.alert()`. Al tocar `Recibí mercadería (+ stock)`, se muestra un panel dentro de la tarjeta del pedido. El botón `Confirmar recepción y sumar stock` ejecuta el mismo endpoint existente:

`PATCH /api/admin/pedidos-proveedor/{id}/estado`

con `{ adminId, estado: 'recibido' }`.

Si el servidor confirma la operación, se actualiza la lista y se muestra el resultado. Si falla, el mensaje queda visible en la pantalla.

No se modifica `server.js`, la base de datos, carrito, pagos, envíos ni otros módulos.

## Instalación

1. Hacé una copia del archivo actual.
2. Extraé el ZIP en la raíz de `Dulces-Lucho-App` y reemplazá solo `screens/AdminStockScreen.js`.
3. Reiniciá Expo con `npx expo start -c`.

La sintaxis fue comprobada; la ejecución real del endpoint y la suma de stock deben verificarse con una recepción de prueba en tu entorno.
