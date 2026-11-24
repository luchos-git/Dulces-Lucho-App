# Stock únicamente por ventas y recepción de proveedores

## Cambio solicitado

Se elimina por completo la carga manual de unidades en Inventario. Ya no existe el campo “Unidades a sumar” ni una acción para incrementar stock desde la ficha del producto.

La pantalla de inventario solo permite configurar:
- stock mínimo para alertas;
- proveedor habitual;
- días estimados de reposición.

La cantidad actual se muestra como solo lectura.

## Cómo cambia el stock

1. **Venta confirmada del cliente:** descuenta automáticamente las unidades compradas.
2. **Venta cancelada:** reintegra automáticamente las unidades de esa venta.
3. **Pedido al proveedor creado/enviado:** no cambia el stock.
4. **Pedido al proveedor marcado como “Recibí mercadería”:** el backend suma automáticamente las cantidades solicitadas en ese pedido. La transacción bloquea el pedido y evita recibirlo dos veces.

La ruta `PATCH /api/admin/productos/:id/stock` ahora solo actualiza la configuración de reposición. Si se intenta enviar `unidadesAgregar`, `stockDisponible`, `stock_disponible`, `stock` u otro campo de cantidades manuales, responde `400` y no modifica las existencias.

## Instalación

1. Detené el backend con `Ctrl + C`.
2. Guardá una copia de `screens/AdminStockScreen.js` y `backend/src/server.js`.
3. Extraé el ZIP en la raíz del proyecto (donde está `App.js`) y reemplazá esos dos archivos manteniendo sus carpetas.
4. Conservá `.env` y `backend/.env`; no hay cambios de configuración.
5. No hace falta ejecutar SQL ni modificar la base de datos.
6. Reiniciá el backend con `cd backend` y `npm start`.
7. Reiniciá Expo desde la raíz con `npx expo start --lan -c`.

## Pruebas sugeridas

### A. Guardar configuración de reposición (no cambia stock)

`PATCH http://localhost:3000/api/admin/productos/ID/stock`

```json
{
  "adminId": 9,
  "stockMinimo": 5,
  "proveedorId": 2,
  "diasReposicionEstimados": 7
}
```

La respuesta debe mostrar el stock existente sin alterarlo.

### B. Intento de incremento manual (debe rechazarse)

`PATCH http://localhost:3000/api/admin/productos/ID/stock`

```json
{
  "adminId": 9,
  "unidadesAgregar": 10,
  "stockMinimo": 5,
  "diasReposicionEstimados": 7
}
```

Debe responder `400` con el mensaje de que el stock solo cambia por ventas y recepciones de proveedores.

### C. Recepción de proveedor

`PATCH http://localhost:3000/api/admin/pedidos-proveedor/ID/estado`

```json
{
  "adminId": 9,
  "estado": "recibido"
}
```

El stock aumenta automáticamente con las cantidades del pedido. Volver a intentar recibir el mismo pedido debe responder `409` y no volver a sumar.

## Archivos incluidos

- `screens/AdminStockScreen.js`
- `backend/src/server.js`

No incluye cambios de base de datos ni credenciales.
