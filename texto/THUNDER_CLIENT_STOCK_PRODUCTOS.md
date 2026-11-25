# Thunder Client — stock, destacados, proveedores y pedidos agotados

Base URL local: `http://localhost:3000/api`

Las rutas administrativas protegidas necesitan `Authorization: Bearer <TOKEN_DE_SESION>`. Usá el flujo normal de inicio de sesión y verificación de administrador para obtenerlo. No pongas el código de administrador ni contraseñas directamente en una colección compartida.

## 1. Estado del servidor

**GET** `/estado`

Esperado: `200 OK`, `ok: true`, backend y MySQL conectados.

## 2. Productos y disponibilidad

**GET** `/productos`

Comprueba que cada producto tenga `stockDisponible`, `stockMinimo`, `destacadoDia` y `destacadoOrden`.

**GET** `/productos/12/disponibilidad`

Reemplazá `12` por un ID real. Responde stock, agotado, proveedor y fecha/plazo estimado.

## 3. Cargar o corregir stock de un producto

**PATCH** `/admin/productos/12/stock`

Headers: `Authorization: Bearer <TOKEN_DE_SESION>`

Body JSON:

```json
{
  "adminId": 9,
  "stockDisponible": 25,
  "stockMinimo": 5,
  "proveedorId": 1,
  "diasReposicionEstimados": 7
}
```

Usá el ID real del administrador y del proveedor. Para no asignar proveedor, enviá `"proveedorId": null`.

## 4. Elegir producto del día y su orden

**PATCH** `/admin/productos/12/destacado`

Headers: `Authorization: Bearer <TOKEN_DE_SESION>`

```json
{
  "adminId": 9,
  "destacado": true,
  "orden": 1
}
```

Para quitarlo de la calesita, cambiá `destacado` a `false`. Los números menores aparecen primero.

## 5. Agregar proveedor (solo propietario)

**POST** `/admin/proveedores`

Headers: `Authorization: Bearer <TOKEN_DE_SESION>`

```json
{
  "nombre": "Distribuidora Ejemplo",
  "contacto": "Ventas",
  "telefono": "1112345678",
  "email": "ventas@example.com",
  "localidad": "Monte Chingolo",
  "plazoEntregaDias": 5
}
```

## 6. Crear reposición o pedido grande

**POST** `/admin/pedidos-proveedor`

Headers: `Authorization: Bearer <TOKEN_DE_SESION>`

```json
{
  "adminId": 9,
  "proveedorId": 1,
  "tipo": "reposicion",
  "fechaEstimadaRecepcion": "2026-12-01",
  "notas": "Reposición semanal",
  "items": [
    { "productoId": 12, "cantidad": 30 },
    { "productoId": 15, "cantidad": 20 }
  ]
}
```

Para un pedido de gran volumen, cambiá `tipo` a `pedido_grande`.

## 7. Actualizar estado de pedido al proveedor

**PATCH** `/admin/pedidos-proveedor/1/estado`

```json
{
  "adminId": 9,
  "estado": "confirmado"
}
```

Estados permitidos: `confirmado`, `en_camino`, `recibido`, `cancelado`. Marcá `recibido` solamente cuando la mercadería haya llegado: recién entonces se suma al stock.

## 8. Solicitud de cliente por producto agotado

**POST** `/pedidos-anticipados`

Headers: `Authorization: Bearer <TOKEN_DE_SESION>`

```json
{
  "usuarioId": 3,
  "productoId": 12,
  "cantidad": 2,
  "fechaDeseada": "2026-12-03",
  "modalidadEntrega": "envio",
  "direccion": "Av. Ejemplo 123",
  "localidad": "Monte Chingolo",
  "metodoPago": "debito",
  "notas": "Entregar por la tarde"
}
```

Para retiro en local, usá `"modalidadEntrega": "retiro"` y dejá dirección/localidad vacías.

## 9. Ver las solicitudes de un cliente

**GET** `/usuarios/3/pedidos-anticipados`

El token debe corresponder al usuario `3`. Cada usuario solamente consulta sus propias solicitudes.

## 10. Confirmar/cancelar solicitud anticipada

**PATCH** `/admin/pedidos-anticipados/1/estado`

```json
{
  "adminId": 9,
  "estado": "confirmado"
}
```

Solo se puede confirmar cuando el estado ya es `producto_disponible` y hay stock suficiente. Al confirmar, las unidades se descuentan/reservan. También podés usar `"estado": "cancelado"` en una solicitud pendiente o disponible.

## 11. Venta normal

**POST** `/ventas`

La app ya realiza esta petición en el checkout y envía el carrito real. Si el stock cambió desde que se agregó el producto, el backend responde `409` y no crea la venta.

## 12. Comprobar el stock en MySQL

```sql
SELECT id, nombre, stock_disponible, stock_minimo, destacado_dia, destacado_orden
FROM productos
ORDER BY nombre;
```

Los productos existentes comienzan en stock `0`. Cargá el conteo físico real antes de habilitarlos a la venta.
