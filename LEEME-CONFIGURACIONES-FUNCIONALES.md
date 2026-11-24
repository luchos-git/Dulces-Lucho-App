# Dulces Lucho — Parche de configuraciones funcionales

Este complemento reemplaza y agrega únicamente archivos relacionados con Configuración. Incluye funciones reales para los apartados de cliente y administración, persistencia de compras en MySQL, migración SQL y colección para Thunder Client.

## Instalación (en este orden)

1. Hacer una copia de seguridad de la carpeta del proyecto y de la base `dulces_lucho`.
2. Si todavía no ejecutaste `database/migracion_perfil_banners.sql` del parche anterior, ejecutalo primero para crear la tabla de banners y los campos de imágenes. Después, en phpMyAdmin, elegí `dulces_lucho`, entrá en SQL y ejecutá `database/migracion_configuraciones_funcionales.sql`. Esta segunda migración también asegura el campo de teléfono y agrega las columnas/tablas de Configuración sin borrar registros.
3. Extraer el ZIP en la carpeta raíz de `Dulces-Lucho-App`, donde está `App.js`, y aceptar combinar carpetas y reemplazar archivos.
4. No reemplazar `.env` ni `backend/.env`. El parche no contiene esos archivos ni la clave de ImgBB.
5. Importar `THUNDER_CLIENT_CONFIGURACIONES_OPENAPI.json` en Thunder Client si se quieren probar las rutas manualmente.
6. Reiniciar el backend (`cd backend` y `npm start`) y Expo (`npx expo start --lan -c` desde la raíz).

## Qué queda funcional

### Cliente
- Métodos de pago: guardar una preferencia entre los métodos habilitados por la tienda; el checkout la propone automáticamente.
- Dirección de entrega: guardar dirección y localidad; el checkout las recupera como valores iniciales.
- Notificaciones: activar/desactivar las notificaciones locales y guardar la preferencia en MySQL.
- Privacidad y seguridad: cambiar la contraseña validando la contraseña actual.
- Mis pedidos y comprobantes: se consultan también desde MySQL. Las compras nuevas dejan de existir solamente en el almacenamiento local del teléfono.

### Administrador
- Gestión de usuarios: consultar cuentas y activar/desactivar acceso sin borrar el historial.
- Pedidos y ventas: consultar compras de todos los usuarios y actualizar su estado logístico.
- Reportes y estadísticas: pedidos, ventas pagadas, pedidos abiertos, clientes compradores, productos activos y productos más vendidos.
- Configuración de la tienda: editar nombre y contacto, dirección, horario, condiciones, habilitar envíos, establecer una tarifa base y activar/desactivar medios de pago.
- Banners del inicio y catálogo siguen en sus pantallas existentes.

## Comprobaciones

1. `GET http://localhost:3000/api/estado` — backend y MySQL conectados.
2. `GET http://localhost:3000/api/configuracion-tienda` — devuelve la configuración de la tienda.
3. Iniciar sesión como cliente y probar Métodos de pago, Dirección, Notificaciones y Seguridad.
4. Iniciar sesión como administrador y probar Gestión de usuarios, Pedidos y ventas, Reportes y Configuración de la tienda.
5. Hacer una compra de prueba. Debe aparecer en Mis pedidos y en el panel de administración. Desde administración, avanzá su estado y comprobá que el seguimiento del cliente se actualice.

**Importante:** las tarjetas se siguen simulando y no se guardan sus datos. Las notificaciones son locales al dispositivo. El backend todavía no usa tokens de sesión; las rutas administrativas verifican el rol consultando MySQL, pero no deben exponerse a Internet sin agregar autenticación de sesión real.
