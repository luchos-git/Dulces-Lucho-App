# Dulces Lucho — Stock de productos terminados, destacados y reposiciones

Este parche reemplaza el flujo anterior de materias primas por un control simple de **productos listos para vender**. La app deja de usar las rutas de insumos/recetas; las tablas antiguas de la base se conservan sin borrarlas para no perder datos históricos.

## Antes de instalar

1. Cerrá Expo y el backend.
2. Hacé una copia de seguridad de la carpeta del proyecto y de la base `dulces_lucho`.
3. En phpMyAdmin, seleccioná `dulces_lucho` y ejecutá **una sola vez** el contenido completo de `database/migracion_stock_productos_proveedores.sql` desde la pestaña SQL.
4. Extraé este ZIP en la carpeta principal del proyecto, donde está `App.js`, y aceptá reemplazar los archivos.
5. Conservá `.env` y `backend/.env`. Este parche no contiene esos archivos ni claves privadas.

La migración está escrita para MariaDB 10.4: no usa `CHECK`, declaraciones `CONSTRAINT` con nombre ni sufijos `ENGINE=`. No borra tablas ni productos existentes.

## Importante: cargar el stock real

Los productos existentes reciben `stock_disponible = 0` porque la base no permite saber cuántas unidades físicas hay hoy. Por eso, después de aplicar la migración:

1. Entrá con la cuenta propietaria `dulces.lucho@gmail.com`.
2. Abrí **Configuración → Stock y proveedores**.
3. En cada producto, cargá la cantidad que realmente tenés, el mínimo que querés mantener y los días estimados para reponer.
4. Guardá el stock.

Mientras el stock sea cero, el producto aparecerá como **AGOTADO**. No se inventan cantidades iniciales.

## Cómo se usa ahora

### 1. Productos del día

En `Stock y proveedores`, administración activa **Mostrar en Productos del día** para los artículos elegidos y escribe un número de orden (1 aparece primero). Al guardar, Inicio muestra esos artículos en una calesita horizontal que el cliente puede mover con el dedo.

El carrito también muestra una calesita horizontal de productos disponibles para agregar. Al abrir un producto se pueden recorrer sus fotos; la cantidad no permite superar el stock real.

### 2. Venta normal

Cuando una compra se confirma, el backend vuelve a consultar y bloquear las filas de stock en MySQL, comprueba las cantidades y descuenta las unidades vendidas. Si no alcanza el stock, devuelve `409` y no guarda una venta incompleta.

Si administración cancela una venta, las unidades de esa venta se reintegran una sola vez. Una venta ya cancelada no se puede reactivar desde el mismo endpoint.

### 3. Proveedores y reposición

La cuenta propietaria agrega proveedores una sola vez desde `Stock y proveedores`. Luego asigna un proveedor habitual a cada producto.

- **Reposición:** pedido normal para volver a tener unidades de un producto.
- **Pedido grande:** pedido de volumen mayor cuando una venta o demanda supera el stock habitual.

El pedido queda registrado en la app con proveedor, artículos, cantidades, fecha estimada y estado. La app no envía automáticamente un WhatsApp, correo ni compra al proveedor: el responsable debe contactarlo por fuera y actualizar el estado en la app.

Estados: Solicitado → Confirmado → En camino → Recibido. **El stock solamente aumenta cuando se marca “Recibí mercadería”**. La recepción no se puede aplicar dos veces.

### 4. Producto agotado y pedido anticipado

En portada, calesitas, carrito y detalle se muestra la etiqueta **AGOTADO** cuando el stock es cero. En la ficha se ocultan las acciones de compra y aparece **Realizar pedido**.

El cliente puede indicar cantidad, fecha en que lo necesita, retiro o envío, dirección/localidad si corresponde, medio de pago preferido y notas. El sistema muestra la fecha/plazo estimado de reposición según el proveedor y los pedidos abiertos.

Esta primera solicitud **no cobra ni reserva stock**. Administración registra la reposición con un proveedor. Cuando recibe la mercadería, la solicitud pasa a **Producto disponible**. Recién entonces administración puede confirmar la solicitud: el backend verifica otra vez el stock y reserva las unidades descontándolas para que no se vendan dos veces. Si no alcanza la cantidad, la confirmación se rechaza y se puede resolver la reposición.

El medio de pago que el cliente elige es una preferencia para coordinar el pedido; no se procesa ningún cobro automático.

## Permisos

- **Propietario:** puede agregar proveedores, administrar stock, elegir productos destacados y registrar/actualizar pedidos de proveedor.
- **Empleado con `gestionar_productos`:** puede elegir los productos del día.
- **Empleado con `gestionar_insumos` (nombre interno heredado):** en esta versión significa administrar stock de productos terminados, no materias primas.
- **Empleado con `solicitar_compras`:** puede registrar y actualizar reposiciones/pedidos grandes con proveedores existentes.
- **Empleado con `gestionar_pedidos`:** puede revisar solicitudes agotadas y confirmarlas/cancelarlas.

La pantalla de permisos de la cuenta propietaria ya muestra el nombre claro “Administrar stock de productos y proveedores”. El código interno `gestionar_insumos` se conserva para no romper permisos que ya estaban asignados.

## Reinicio

En una terminal, desde `backend`:

```bash
npm start
```

En otra terminal, desde la raíz del proyecto:

```bash
npx expo start --lan -c
```

Si cambia la IPv4 de la computadora, actualizá solo la dirección en el `.env` principal de Expo. No modifiques `backend/.env` por este parche.

## Thunder Client

Importá `THUNDER_CLIENT_STOCK_PRODUCTOS_OPENAPI.json` desde Thunder Client → Collections → Import. La guía `THUNDER_CLIENT_STOCK_PRODUCTOS.md` enumera las pruebas y los cuerpos de ejemplo. Las rutas administrativas requieren un Bearer token válido; primero iniciá sesión y verificá la cuenta administradora con el flujo de acceso existente.

## Comprobaciones recomendadas

1. GET `/api/estado` debe devolver `200`.
2. GET `/api/productos` debe mostrar `stockDisponible` y `destacadoDia`.
3. Actualizá el stock real de un artículo y probá agregarlo al carrito.
4. Agotá temporalmente un artículo de prueba y comprobá el banner + `Realizar pedido`.
5. Registrá una reposición de prueba, marcala recibida y verificá que el stock aumente.
6. Confirmá una solicitud anticipada y verificá que el stock baje.
7. Cancelá una venta de prueba y verificá que se reintegren sus unidades.

No borres las tablas viejas `insumos`, `recetas_productos`, `compras_insumos` ni sus detalles. Ya no las usa la app, pero se conservan como histórico hasta que decidas eliminarlas con una copia de seguridad verificada.
