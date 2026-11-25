# Dulces Lucho — actualización de stock y pedidos múltiples

## Archivos incluidos

- `screens/AdminStockScreen.js`: reorganiza la pantalla para mostrar primero proveedores y encargos abiertos; agrega resumen de prioridades, filtros, colores de stock y selección múltiple con cantidad por producto.
- `backend/src/server.js`: conserva el backend con sesión segura de administración y abastecimiento; la respuesta de abastecimiento ahora incluye `proveedorId` en cada pedido y ordena los encargos abiertos antes que el historial.

No se modifican tablas ni se requiere migración SQL.

## Lógica automática de inventario

1. Al confirmar una compra del cliente (`POST /api/ventas`), el servidor valida las cantidades dentro de una transacción y resta las unidades de `productos.stock_disponible`.
2. Si se cancela una venta desde administración, el backend devuelve las unidades al stock.
3. Al registrar una solicitud al proveedor (`POST /api/admin/pedidos-proveedor`), el pedido queda como `solicitado`. El stock todavía no aumenta porque la mercadería no está en el local.
4. Cuando llega la mercadería, administración marca el pedido como `recibido`. El backend suma automáticamente todas las cantidades del pedido. La transición está protegida para impedir sumar dos veces un pedido ya recibido.

## Prioridad y selección múltiple

- Rojo: agotado (0 unidades).
- Naranja: stock bajo (existencias menores o iguales al mayor entre el mínimo configurado y 5).
- Verde: stock suficiente.
- El filtro inicial muestra productos agotados o con stock bajo.
- `Seleccionar todos los prioritarios` permite agregar varios productos al mismo pedido.
- Cada producto seleccionado tiene su propia cantidad; se puede quitar individualmente.
- `Todos` permite elegir también productos con existencias suficientes.

## Instalación

1. Detené el backend con `Ctrl + C`.
2. Hacé una copia del `backend/src/server.js` actual.
3. Extraé este paquete en la raíz del proyecto (donde está `App.js`) y reemplazá los dos archivos conservando sus rutas.
4. No reemplaces `.env`, `backend/.env`, la base de datos ni otros archivos.
5. Iniciá el backend con `cd backend` y `npm start`.
6. Reiniciá Expo desde la raíz con `npx expo start --lan -c`.

## Pruebas sugeridas en Thunder Client

### Consultar proveedores, encargos y stock

- Método: `GET`
- URL: `http://localhost:3000/api/admin/abastecimiento?adminId=9`
- Verificar que cada elemento de `pedidos` incluye `proveedorId` y que los estados `solicitado`, `confirmado` y `en_camino` aparecen antes que los finalizados.

### Crear pedido con varios productos

- Método: `POST`
- URL: `http://localhost:3000/api/admin/pedidos-proveedor`
- Header: `Content-Type: application/json`
- Body de ejemplo (reemplazar IDs existentes):

```json
{
  "adminId": 9,
  "proveedorId": 1,
  "tipo": "reposicion",
  "fechaEstimadaRecepcion": "2026-12-01",
  "notas": "Reposición de productos con stock bajo",
  "items": [
    { "productoId": 1, "cantidad": 12 },
    { "productoId": 2, "cantidad": 8 },
    { "productoId": 3, "cantidad": 5 }
  ]
}
```

Este pedido no suma stock todavía.

### Registrar recepción

- Método: `PATCH`
- URL: `http://localhost:3000/api/admin/pedidos-proveedor/ID_DEL_PEDIDO/estado`
- Header: `Content-Type: application/json`
- Body:

```json
{ "adminId": 9, "estado": "recibido" }
```

Al recibir `200 OK`, el backend suma las cantidades de todos los productos en una transacción. Volver a enviar `recibido` para el mismo pedido debe responder `409` y no duplicar el stock.

### Verificar stock en MySQL

```sql
SELECT id, nombre, stock_disponible, stock_minimo
FROM productos
ORDER BY stock_disponible ASC, nombre ASC;
```

## Nota

No marcar un pedido como `recibido` hasta que la mercadería haya llegado físicamente. Las ventas confirmadas se descuentan automáticamente al confirmarse el checkout de la app; si se cancela una venta, el servidor reintegra las unidades.
