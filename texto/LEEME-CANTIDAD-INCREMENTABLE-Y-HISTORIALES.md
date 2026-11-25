# Ajuste de stock incremental e historiales

## Qué cambia

1. **Cantidad actual es de solo lectura.** La pantalla muestra el stock real como texto y ya no permite escribir encima.
2. **Unidades a sumar.** Para registrar mercadería recibida manualmente, se escribe únicamente la cantidad adicional. El backend ejecuta `stock_disponible = stock_disponible + unidadesAgregar` dentro de una transacción.
3. **No se admite reemplazar el stock.** La ruta `PATCH /api/admin/productos/:id/stock` devuelve `400` si recibe el antiguo campo `stockDisponible`. Debe utilizar `unidadesAgregar`.
4. **Los historiales se mueven debajo del formulario “Nuevo pedido a proveedor”.** Primero aparecen todos los pedidos a proveedores con sus estados y acciones; debajo, los pedidos de clientes por productos agotados. El inventario y la selección de productos del día quedan después.
5. Las ventas y las recepciones de pedidos a proveedores conservan sus actualizaciones automáticas existentes.

## Archivos incluidos

- `screens/AdminStockScreen.js`
- `backend/src/server.js`

No hay cambios de estructura en MySQL, así que **no hace falta ejecutar una migración SQL**.

## Instalación

1. Cerrá el backend con `Ctrl + C`.
2. Hacé una copia de `backend/src/server.js` y `screens/AdminStockScreen.js`.
3. Extraé este ZIP sobre la raíz del proyecto (donde está `App.js`) y reemplazá esos dos archivos, respetando las carpetas.
4. No reemplaces `.env` ni `backend/.env`.
5. Iniciá el backend (`cd backend` y `npm start`) y Expo (`npx expo start --lan -c` desde la raíz).

## Prueba manual en Thunder Client

Método: `PATCH`

URL: `http://localhost:3000/api/admin/productos/ID_DEL_PRODUCTO/stock`

Body JSON de ejemplo:

```json
{
  "adminId": 9,
  "unidadesAgregar": 8,
  "stockMinimo": 5,
  "proveedorId": 2,
  "diasReposicionEstimados": 7
}
```

El resultado debe devolver `stockDisponible` con el total nuevo y `unidadesAgregadas: 8`.

Para cambiar solamente la configuración, enviá `unidadesAgregar: 0`.

No envíes `stockDisponible`: el backend ahora rechaza ese campo para impedir que se reemplace la cantidad actual.

## Comportamiento de existencias

- La venta confirmada descuenta las unidades.
- La recepción de un pedido al proveedor suma las unidades solicitadas una sola vez.
- La operación manual “Unidades a sumar” agrega unidades; nunca reemplaza el saldo.
- El historial de pedidos a proveedores y el de pedidos de clientes aparece inmediatamente debajo del formulario de pedido a proveedor.
