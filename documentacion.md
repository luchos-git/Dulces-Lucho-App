# Dulces Lucho App

## Origen y propósito

Dulces Lucho es una aplicación móvil de catálogo y compra de golosinas. Nació como una interfaz Expo/React Native para que clientes puedan registrarse, descubrir productos, armar su carrito y seguir sus pedidos. Esta versión incorpora una API propia, MySQL, productos administrables con fotos alojadas en ImgBB e historial para que una cuenta pueda tener varios pedidos en camino.

La apariencia original se conserva: los cambios agregan datos reales y funciones de administración sin rediseñar las pantallas.

## Puesta en marcha

1. Importá `database/dulces_lucho.sql` en MySQL. Para añadir productos de ejemplo, ejecutá `database/productos_iniciales_y_crud.sql`.
2. En `backend`, copiá `.env.example` como `.env`, configurá MySQL e ingresá la clave de ImgBB entregada.
3. Ejecutá `npm install` y `npm start` dentro de `backend`.
4. En la raíz de la app ejecutá `npm install`. En un celular real definí `EXPO_PUBLIC_API_URL` con la IP local de la PC, por ejemplo `http://192.168.1.20:3000/api`; no uses `localhost` porque sería el propio teléfono.
5. Ejecutá `npx expo start`.

## Notificaciones

Son locales y se programan por pedido. La versión anterior cancelaba todos los avisos al confirmar una compra nueva; ahora cada aviso tiene el identificador de su pedido y pueden coexistir pedidos. También se agrega el plugin de Expo y el permiso Android `POST_NOTIFICATIONS`. Probalo en un dispositivo o development build actualizado: aceptar el permiso del sistema y comprobar que las notificaciones de la app no estén silenciadas.

## Guía por archivo

| Archivo/carpeta | Función |
|---|---|
| `App.js` | Compone proveedores y navegación principal. |
| `context/AuthContext.js` | Registro, inicio de sesión y segunda clave de administrador; usa MySQL mediante la API y conserva un respaldo local para demo. |
| `context/ProductosContext.js` | Obtiene el catálogo, cachea datos y expone altas, cambios y bajas lógicas. |
| `context/CarritoContext.js` | Carrito, cantidades y selección de ítems. |
| `context/PedidoContext.js` | Mantiene varios pedidos y su historial local. |
| `screens/HomeScreen.js` | Catálogo, filtros y fotos de productos. |
| `screens/DetalleProducto.js` | Descripción, cantidad, compra y productos de la misma categoría. |
| `screens/PanelAdminScreen.js` | CRUD de productos: foto, nombre, categoría, descripción, precio, edición y ocultamiento. |
| `screens/HistorialPedidosScreen.js` | Separa pedidos en camino del historial entregado. |
| `screens/SeguimientoPedido.js` | Estado y detalle de un pedido seleccionado. |
| `screens/prepararCompra.js` | Pago, cupón, envío y creación del pedido. |
| `screens/carrito.js` | Carrito, envío y recomendaciones. |
| `screens/LoginScreen.js`, `RegistroScreen.js`, `ClaveAdminScreen.js` | Acceso de cliente/administrador y verificación adicional. |
| `components/EntregaEnvio.js` | Formulario y cálculo de retiro/envío. |
| `components/ModalAgregar.js` | Selector de cantidad para recomendados. |
| `navigation/DrawerMenu.js` | Menú lateral y enlace a pedidos/panel. |
| `services/api.js` | Cliente HTTP de la app y envío de imagen al backend. |
| `services/notificaciones.js` | Permisos, canal Android y avisos locales por pedido. |
| `data/` | Datos de demostración y reglas de seguimiento/cupones. |
| `database/dulces_lucho.sql` | Esquema completo MySQL. |
| `database/productos_iniciales_y_crud.sql` | SQL inicial y ejemplos CRUD. |
| `database/migracion_v2_pedidos.sql` | Migración segura para instalaciones anteriores. |
| `backend/src/server.js` | API Express: productos, usuarios y proxy seguro de ImgBB. |
| `backend/.env.example` | Variables de MySQL, clave ImgBB y código administrador. |

## Seguridad y límites actuales

La clave de ImgBB queda solo en `backend/.env`, nunca en JavaScript móvil ni en Git. Las contraseñas se guardan con bcrypt. La baja de productos es lógica para no romper ventas antiguas. La API de pedidos puede ampliarse para que el administrador actualice estados desde un panel operativo; actualmente la app conserva el historial local y la base ya tiene el campo `estado_pedido` para ese siguiente paso.


## uso con expo go y thunder client

la aplicación se ejecuta en el celular con expo go escaneando el qr, no necesita generar un apk. para eso expo se inicia desde la carpeta principal con `npx expo start --lan -c`

el backend se inicia por separado desde `backend` con `npm start` y escucha en el puerto 3000. thunder client usa `http://localhost:3000` porque se ejecuta en la computadora. el celular debe usar la ip local de la computadora configurada en el archivo `.env` de la raíz mediante `EXPO_PUBLIC_API_URL`

las rutas para crear cuentas, iniciar sesión y verificar administradores están documentadas con sus cuerpos json en `THUNDER_CLIENT_Y_EXPO_GO.md`

el código actual no tiene una aprobación manual de administradores ni una ruta para aprobar pagos. las cuentas admin se crean con un código de autorización y una clave única. los pedidos de compra se guardan localmente en el celular y todavía no se envían a una ruta de ventas de mysql

## archivos de configuración y recursos

los json se explican en `CONFIGURACION_Y_ARCHIVOS_AUXILIARES.md`, porque agregar comentarios dentro de esos archivos rompería su formato. las imágenes se describen en `assets/README.md`


para consultar la explicación archivo por archivo, revisá `INDICE_DE_ARCHIVOS.md`


## límites de la versión actual

el código de autorización también se comprueba desde el formulario móvil, por eso el valor de `data/usuarios.js` no debe considerarse secreto. el backend vuelve a comprobarlo desde `backend/.env`. las rutas de productos todavía no exigen una sesión ni un rol en el servidor, así que esta versión debe tratarse como un prototipo escolar y no como un sistema listo para publicar
