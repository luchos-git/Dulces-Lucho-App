# Thunder Client — Configuraciones de Dulces Lucho

## Antes de probar

1. Si no está aplicada, ejecutá primero `database/migracion_perfil_banners.sql`; después ejecutá `database/migracion_configuraciones_funcionales.sql` desde phpMyAdmin > base `dulces_lucho` > SQL.
2. Reiniciá el backend con `npm start`.
3. En VS Code abrí Thunder Client > Collections > Import y seleccioná `THUNDER_CLIENT_CONFIGURACIONES_OPENAPI.json`.
4. La colección usa `http://localhost:3000/api`. Para probar desde el celular se mantiene la IP LAN en el `.env` de Expo, no en Thunder Client.
5. Reemplazá los IDs de ejemplo por IDs reales de tu tabla `usuarios`.

## Solicitudes incluidas

| Método | Ruta | Para qué sirve |
|---|---|---|
| GET | `/api/configuracion-tienda` | Consultar los datos públicos y medios de pago habilitados |
| GET | `/api/usuarios/:id/preferencias` | Consultar dirección, método preferido y notificaciones |
| PUT | `/api/usuarios/:id/preferencias` | Guardar las preferencias del usuario |
| POST | `/api/usuarios/:id/password` | Cambiar contraseña verificando la actual |
| GET | `/api/usuarios/:id/pedidos` | Historial persistido en MySQL |
| POST | `/api/ventas` | Registrar una compra en `ventas` y `detalle_ventas` |
| GET | `/api/admin/usuarios?adminId=ID` | Listar usuarios desde administración |
| PATCH | `/api/admin/usuarios/:id/estado` | Habilitar/deshabilitar una cuenta |
| GET | `/api/admin/ventas?adminId=ID` | Consultar pedidos y ventas |
| PATCH | `/api/admin/ventas/:id/estado` | Avanzar/cancelar el estado de un pedido |
| GET | `/api/admin/reportes?adminId=ID` | Indicadores comerciales y productos más vendidos |
| PUT | `/api/admin/configuracion-tienda` | Editar datos, envíos y métodos de pago |

Los ejemplos Body están incluidos en la colección OpenAPI. Para los PATCH/PUT de administración, `adminId` debe ser el ID de una cuenta cuyo `rol` sea `admin` y que esté activa.

## Qué hace la app con estas rutas

- **Métodos de pago:** el cliente guarda su medio preferido; el checkout lo propone automáticamente. La administración habilita/deshabilita crédito, débito y Rapipago.
- **Dirección de entrega:** el cliente guarda calle y localidad; se cargan como valores iniciales en el checkout y se pueden editar para cada pedido.
- **Notificaciones:** el usuario activa/desactiva avisos locales en su dispositivo. Se muestra el aviso de compra y, con el seguimiento abierto, los cambios de estado que detecta al consultar MySQL cada 20 segundos. Para recibirlos también debe conceder permiso al sistema operativo.
- **Privacidad y seguridad:** permite cambiar la contraseña ingresando la actual. El backend guarda el hash mediante bcrypt.
- **Gestión de usuarios:** lista cuentas y permite pausar/reactivar su acceso sin borrar historial ni ventas. No se permite que el administrador se desactive a sí mismo.
- **Pedidos y ventas:** cada compra nueva se registra en MySQL. Administración puede ver detalle y actualizar su estado. La pantalla de seguimiento del cliente consulta ese estado al abrirse y cada 20 segundos.
- **Reportes:** se calculan a partir de `ventas`, `detalle_ventas` y `productos`; el total vendido suma ventas marcadas como pagadas.
- **Configuración de tienda:** guarda datos públicos, condición comercial, habilitación de envío y medios de pago. El costo base de envío se agrega al cálculo por distancia que ya usa la aplicación.

## Aclaraciones funcionales

- Los pagos con tarjeta siguen siendo una simulación: no hay pasarela de cobro conectada y no se envían ni guardan PAN, vencimiento o CVV.
- Las notificaciones son locales y la app las muestra cuando detecta cambios mientras el seguimiento está abierto. No son notificaciones push del servidor cuando la app está cerrada.
- La API actual del proyecto no utiliza tokens de sesión. Las rutas administrativas vuelven a comprobar en MySQL que el `adminId` informado pertenece a un administrador activo, pero esto no equivale a autenticación robusta para publicar el backend en Internet. Mantener el uso en la red de pruebas/local hasta incorporar sesiones autenticadas.
