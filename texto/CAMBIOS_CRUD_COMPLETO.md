# cambios de la versión CRUD completo

## archivos modificados

- `backend/src/server.js`: agregué la consulta individual `GET /api/productos/:id`, validación de ID, validación de los datos del producto y comprobación de existencia antes de actualizar. La baja lógica responde con JSON para confirmar el resultado.
- `context/ProductosContext.js`: actualiza el caché local de forma segura después de modificar y eliminar.
- `screens/PanelAdminScreen.js`: hace explícitas las opciones `Actualizar` y `Eliminar`, actualiza el texto del formulario, muestra cuántos productos están publicados y agrega confirmación antes de eliminar.
- `screens/DetalleProducto.js`: aclara la eliminación desde la ficha y explica que se conserva el historial de ventas.
- `README.md`: agrega la descripción del CRUD.

## archivo agregado

- `CRUD_PRODUCTOS_THUNDER_CLIENT.md`: instrucciones para probar CREATE, READ, UPDATE y DELETE en Thunder Client, además de consultas para verificar los cambios en MySQL.

## funcionamiento de eliminar

Se usa baja lógica (`activo = 0`) en lugar de borrar físicamente la fila. La tabla `detalle_ventas` tiene una clave foránea hacia `productos`; conservar la fila evita romper pedidos y ventas anteriores. Los productos eliminados dejan de aparecer en el catálogo porque el endpoint de listado devuelve solamente los que tienen `activo = 1`.

## pruebas realizadas

Se revisó la sintaxis de los archivos backend y JSX con herramientas de validación estática. La prueba real de consultas necesita que el usuario ejecute el servidor contra su propia base de datos MySQL.
