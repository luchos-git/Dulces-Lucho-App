# Dulces Lucho — pedidos por falta de stock y seguimiento de entrega

## Qué cambia

- El cliente ve sus solicitudes por falta de stock como **pedidos por falta de stock**, con estado claro y próximos pasos.
- Después de la confirmación de la tienda, el usuario verá **Pedido confirmado · pendiente de preparación/entrega**.
- Administración puede avanzar el pedido: confirmar y reservar stock, preparar, despachar (envío) o dejar listo para retirar, y marcar entregado.
- Si se cancela antes del despacho, las unidades reservadas se devuelven al stock. Una transición repetida no vuelve a sumar ni descontar unidades.
- Se aumenta moderadamente el tamaño de texto en el formulario de pedido agotado, el historial y el seguimiento de compras.

## Archivos del paquete

- `screens/HistorialPedidosScreen.js`
- `screens/PedidoAgotadoScreen.js`
- `screens/SeguimientoPedido.js`
- `screens/AdminStockScreen.js`
- `actualizar_estados_pedidos_anticipados.ps1` (parche seguro para modificar solo la ruta correspondiente de `backend/src/server.js`)

## Instalación

1. Hacé una copia de la carpeta del proyecto y de la base `dulces_lucho`.
2. Cerrá Expo y el backend.
3. Extraé este ZIP en la carpeta principal `Dulces-Lucho-App` (la misma donde está `App.js`) y aceptá reemplazar solamente los cuatro archivos de `screens` incluidos.
4. Abrí PowerShell en esa carpeta principal y ejecutá:

```powershell
powershell -ExecutionPolicy Bypass -File .\actualizar_estados_pedidos_anticipados.ps1
```

El script hace una copia de seguridad automática de `backend/src/server.js` y reemplaza únicamente la ruta `PATCH /api/admin/pedidos-anticipados/:id/estado`. Si no reconoce la versión actual, se detiene sin modificar `server.js`.

5. Iniciá el backend con `cd backend` y `npm start`.
6. En otra terminal, desde la raíz del proyecto, iniciá Expo con `npx expo start --lan -c`.

No hay migración SQL: la tabla `pedidos_anticipados.estado` ya es `VARCHAR(30)` en la migración de stock, por lo que admite los nuevos estados. No reemplaces `.env`, `backend/.env`, pagos, carrito ni envíos.

## Cómo funciona el flujo

1. `pendiente_reposicion`: solicitud registrada; espera la reposición del proveedor.
2. `producto_disponible`: ya hay stock; administración debe confirmar la solicitud.
3. `confirmado`: administración confirma y el backend reserva la cantidad solicitada.
4. `preparando`: el local prepara el pedido.
5. `en_camino`: para pedidos con envío; `listo_para_retirar`: para retiro.
6. `entregado`: administración registra que el cliente lo recibió.
7. `cancelado`: se cancela. Si el pedido ya tenía unidades reservadas y aún no fue despachado, el backend las devuelve al inventario.

**Importante:** estos pedidos anticipados no se convierten en ventas cobradas automáticamente. El estado informa la disponibilidad, reserva y entrega, pero no ejecuta un cobro. Eso conserva el comportamiento actual del módulo.

## Prueba sugerida

Usá un pedido de prueba de un producto sin stock:

- Primero debe aparecer en el historial del usuario como `Esperando reposición`.
- Al recibir stock del proveedor, debe pasar a `Producto repuesto`.
- Cuando administración confirma, debe verse `Pedido confirmado · pendiente de preparación` y el inventario debe descontar las unidades una sola vez.
- Administración marca `Preparando`; después `En camino` para envío o `Listo para retirar` para retiro.
- Finalmente marca `Entregado`; el usuario debe verlo actualizado en `Mis pedidos` (se refresca cada 5 segundos y también al deslizar hacia abajo).
